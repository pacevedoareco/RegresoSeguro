import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isValidTransition } from "@/lib/services/transitions";
import { ServiceStatus } from "@/types/database";
import { getStatusNotificationContent, sendPushToUser } from "@/lib/push/push";
import { calculateSettlement, DEFAULT_COMMISSION_RATE } from "@/lib/earnings/earnings";

const updateStatusSchema = z.object({
  status: z.enum([
    "requested",
    "assigned",
    "en_route",
    "in_progress",
    "completed",
    "cancelled",
  ]),
  notes: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { code: "INVALID_ID", message: "ID de servicio inválido." },
      { status: 400 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { code: "INVALID_JSON", message: "Cuerpo de la solicitud inválido." },
      { status: 400 }
    );
  }

  const parsed = updateStatusSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.errors[0]?.message ?? "Estado inválido.";
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message },
      { status: 400 }
    );
  }

  const { status: newStatus, notes } = parsed.data;

  const supabase = await createClient();
  const serviceClient = await createServiceClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "No autenticado." },
      { status: 401 }
    );
  }

  // Get service details
  const { data: service, error: serviceError } = await (serviceClient as any)
    .from("services")
    .select("*")
    .eq("id", id)
    .single();

  if (serviceError || !service) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "Servicio no encontrado." },
      { status: 404 }
    );
  }

  const currentStatus = service.status as ServiceStatus;

  // Validate state transition (BR-014, BR-015)
  if (!isValidTransition(currentStatus, newStatus)) {
    return NextResponse.json(
      {
        code: "INVALID_TRANSITION",
        message: `Transición no permitida de "${currentStatus}" a "${newStatus}".`,
      },
      { status: 400 }
    );
  }

  // Check role & permissions
  const { data: profile } = await (supabase as any)
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const userRole = profile?.role ?? "rider";

  // Only the assigned driver or admin staff may drive status transitions
  const isStaff = userRole === "operator" || userRole === "super_admin";
  if (!isStaff) {
    if (userRole !== "driver" || service.driver_id !== user.id) {
      return NextResponse.json(
        {
          code: "FORBIDDEN",
          message: "No sos el conductor asignado a este servicio.",
        },
        { status: 403 }
      );
    }
  }

  // Prepare updates
  const updateData: Record<string, any> = {
    status: newStatus,
  };

  if (newStatus === "completed") {
    const completedAt = new Date().toISOString();
    updateData.completed_at = completedAt;

    // HU-35: settle the service — commission is frozen at completion (PD-026)
    const { data: pricing } = await (serviceClient as any)
      .from("pricing_config")
      .select("commission_rate")
      .eq("id", 1)
      .maybeSingle();

    const commissionRate = Number(pricing?.commission_rate ?? DEFAULT_COMMISSION_RATE);
    const settlement = calculateSettlement(
      Number(service.final_price ?? service.estimated_price ?? 0),
      commissionRate
    );
    updateData.commission_rate_at_time = settlement.commissionRate;
    updateData.commission_amount = settlement.commissionAmount;
    updateData.driver_net_amount = settlement.netAmount;

    // Cash is collected by the driver at drop-off
    if (service.payment_method === "cash" && service.payment_status !== "paid") {
      updateData.payment_status = "paid";
      updateData.paid_at = completedAt;
    }
  }

  const { data: updatedService, error: updateError } = await (serviceClient as any)
    .from("services")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (updateError) {
    console.error("[status:patch] Update error:", updateError.message);
    return NextResponse.json(
      { code: "UPDATE_ERROR", message: "No se pudo actualizar el estado." },
      { status: 500 }
    );
  }

  // Record audit log
  await (serviceClient as any).from("service_status_log").insert({
    service_id: id,
    from_status: currentStatus,
    to_status: newStatus,
    changed_by: user.id,
    notes: notes || `Status transitioned by ${userRole}`,
  });

  // Send push notification to rider on status transition (FR-019)
  try {
    const notificationPayload = getStatusNotificationContent(newStatus, {
      serviceId: id,
    });
    if (notificationPayload && service.rider_id) {
      await sendPushToUser(service.rider_id, notificationPayload);
    }
  } catch (pushErr: any) {
    console.error("[status:patch] Push notification failed:", pushErr.message);
  }

  return NextResponse.json(
    { service: updatedService, message: "Estado actualizado con éxito." },
    { status: 200 }
  );
}

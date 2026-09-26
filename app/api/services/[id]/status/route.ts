import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isValidTransition } from "@/lib/services/transitions";
import { ServiceStatus } from "@/types/database";

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
  const { data: service, error: serviceError } = await serviceClient
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
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const userRole = profile?.role ?? "rider";

  // If driver is changing status, must be the assigned driver
  if (userRole === "driver") {
    if (service.driver_id !== user.id) {
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
    updateData.completed_at = new Date().toISOString();
  }

  const { data: updatedService, error: updateError } = await serviceClient
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
  await serviceClient.from("service_status_log").insert({
    service_id: id,
    from_status: currentStatus,
    to_status: newStatus,
    changed_by: user.id,
    notes: notes || `Status transitioned by ${userRole}`,
  });

  return NextResponse.json(
    { service: updatedService, message: "Estado actualizado con éxito." },
    { status: 200 }
  );
}

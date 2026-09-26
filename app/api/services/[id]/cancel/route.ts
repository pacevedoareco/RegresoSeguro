import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isValidTransition } from "@/lib/services/transitions";
import {
  cancellationIncursStrike,
  newStrikeCount,
  shouldBeSuspended,
} from "@/lib/strikes/strikes";
import { ServiceStatus } from "@/types/database";
import { getStatusNotificationContent, sendPushToUser } from "@/lib/push/push";
import { sendStrikeWarning } from "@/lib/resend/emails";

const cancelSchema = z.object({
  reason: z.string().optional(),
});

export async function POST(
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

  let body: unknown = {};
  try {
    const text = await request.text();
    if (text) {
      body = JSON.parse(text);
    }
  } catch {
    return NextResponse.json(
      { code: "INVALID_JSON", message: "Cuerpo de la solicitud inválido." },
      { status: 400 }
    );
  }

  const parsed = cancelSchema.safeParse(body);
  const reason = parsed.success ? parsed.data.reason : undefined;

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

  // Validate state transition (BR-014: requested->cancelled or assigned->cancelled)
  if (!isValidTransition(currentStatus, "cancelled")) {
    return NextResponse.json(
      {
        code: "INVALID_TRANSITION",
        message: `No se puede cancelar un servicio en estado "${currentStatus}".`,
      },
      { status: 400 }
    );
  }

  // Check user role
  const { data: profile } = await (supabase as any)
    .from("profiles")
    .select("id, role, strikes, is_suspended")
    .eq("id", user.id)
    .single();

  const userRole = profile?.role ?? "rider";
  const isRider = service.rider_id === user.id;
  const isOperator = userRole === "operator" || userRole === "super_admin";

  if (!isRider && !isOperator) {
    return NextResponse.json(
      {
        code: "FORBIDDEN",
        message: "No tenés permiso para cancelar este servicio.",
      },
      { status: 403 }
    );
  }

  let strikeAdded = false;
  let newStrikes = profile?.strikes ?? 0;
  let isSuspendedNow = profile?.is_suspended ?? false;

  // BR-003, BR-004, OQ-004:
  // If rider cancels from assigned -> strike is added.
  // If operator cancels from assigned -> no strike to rider (OQ-004 / PD-023).
  // If cancelled from requested -> no strike (free cancellation).
  if (isRider && cancellationIncursStrike(currentStatus)) {
    strikeAdded = true;
    newStrikes = newStrikeCount(profile?.strikes ?? 0, currentStatus);
    isSuspendedNow = shouldBeSuspended(newStrikes);

    const { error: profileUpdateError } = await (serviceClient as any)
      .from("profiles")
      .update({
        strikes: newStrikes,
        is_suspended: isSuspendedNow,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (profileUpdateError) {
      console.error("[cancel:post] Profile update error:", profileUpdateError.message);
    }

    // Send transactional strike warning email (FR-020 / AC-020-2)
    if (user.email) {
      try {
        const { data: riderProfile } = await (serviceClient as any)
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();

        const riderName = riderProfile?.full_name || "Pasajero";
        await sendStrikeWarning(user.email, riderName, newStrikes);
      } catch (emailErr: any) {
        console.error("[cancel:post] Failed to send strike email:", emailErr.message);
      }
    }
  }

  // Update service record
  const now = new Date().toISOString();
  const cancellationNote =
    reason ||
    (isRider
      ? `Cancelado por el pasajero (${currentStatus === "assigned" ? "con strike" : "sin penalidad"})`
      : `Cancelado por el operador (${userRole})`);

  const { data: updatedService, error: updateError } = await (serviceClient as any)
    .from("services")
    .update({
      status: "cancelled",
      cancellation_reason: cancellationNote,
      cancelled_by: user.id,
      cancelled_at: now,
    })
    .eq("id", id)
    .select()
    .single();

  if (updateError) {
    console.error("[cancel:post] Service cancel error:", updateError.message);
    return NextResponse.json(
      { code: "UPDATE_ERROR", message: "Error al cancelar el servicio." },
      { status: 500 }
    );
  }

  // Insert status audit log
  await (serviceClient as any).from("service_status_log").insert({
    service_id: id,
    from_status: currentStatus,
    to_status: "cancelled",
    changed_by: user.id,
    notes: cancellationNote,
  });

  // Send cancellation push notification to rider (if operator cancelled or external cancellation)
  try {
    const notificationPayload = getStatusNotificationContent("cancelled", {
      cancellationReason: cancellationNote,
      serviceId: id,
    });
    if (notificationPayload && service.rider_id) {
      await sendPushToUser(service.rider_id, notificationPayload);
    }
  } catch (pushErr: any) {
    console.error("[cancel:post] Push notification failed:", pushErr.message);
  }

  return NextResponse.json(
    {
      service: updatedService,
      strikeAdded,
      strikes: newStrikes,
      isSuspended: isSuspendedNow,
      message: strikeAdded
        ? `Servicio cancelado. Se aplicó 1 strike (${newStrikes}/3).`
        : "Servicio cancelado con éxito.",
    },
    { status: 200 }
  );
}

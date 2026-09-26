import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { calculatePrice } from "@/lib/pricing/pricing";
import { calculateThreeLegDistances } from "@/lib/services/routing";
import { getStatusNotificationContent, sendPushToUser } from "@/lib/push/push";

const assignSchema = z.object({
  driver_id: z.string().uuid("ID de conductor inválido"),
  proceed_with_stale_gps: z.boolean().optional().default(false),
});

// GPS staleness threshold: 5 minutes (PD-021 / OQ-002)
const GPS_STALENESS_THRESHOLD_MS = 5 * 60 * 1000;

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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { code: "INVALID_JSON", message: "Cuerpo de la solicitud inválido." },
      { status: 400 }
    );
  }

  const parsed = assignSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.errors[0]?.message ?? "Datos inválidos.";
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message },
      { status: 400 }
    );
  }

  const { driver_id, proceed_with_stale_gps } = parsed.data;

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

  // 1. Check user role: operator or super_admin required
  const { data: operatorProfile } = await (supabase as any)
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = operatorProfile?.role;
  if (role !== "operator" && role !== "super_admin") {
    return NextResponse.json(
      {
        code: "FORBIDDEN",
        message: "Acceso denegado. Se requiere rol de operador o super-admin.",
      },
      { status: 403 }
    );
  }

  // 2. Fetch service details
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

  if (service.status !== "requested") {
    return NextResponse.json(
      {
        code: "INVALID_STATUS",
        message: `El servicio está en estado "${service.status}". Solo se pueden asignar solicitudes pendientes ("requested").`,
      },
      { status: 400 }
    );
  }

  // 3. Validate driver eligibility (BR-018, BR-019)
  const { data: driverProfile, error: driverError } = await (serviceClient as any)
    .from("driver_profiles")
    .select("*, profile:profiles!driver_profiles_id_fkey(full_name, is_suspended)")
    .eq("id", driver_id)
    .single();

  if (driverError || !driverProfile) {
    return NextResponse.json(
      { code: "DRIVER_NOT_FOUND", message: "Perfil de conductor no encontrado." },
      { status: 404 }
    );
  }

  if (!driverProfile.is_active) {
    return NextResponse.json(
      {
        code: "DRIVER_INACTIVE",
        message: "El conductor está desactivado y no puede recibir viajes.",
      },
      { status: 400 }
    );
  }

  if (driverProfile.availability !== "online") {
    return NextResponse.json(
      {
        code: "DRIVER_OFFLINE",
        message: "El conductor no está conectado (offline).",
      },
      { status: 400 }
    );
  }

  // Check if driver has another active assignment
  const { data: driverActiveService } = await (serviceClient as any)
    .from("services")
    .select("id")
    .eq("driver_id", driver_id)
    .in("status", ["assigned", "en_route", "in_progress"])
    .maybeSingle();

  if (driverActiveService) {
    return NextResponse.json(
      {
        code: "DRIVER_BUSY",
        message: "El conductor ya tiene un viaje activo asignado.",
      },
      { status: 409 }
    );
  }

  // 4. GPS check and staleness evaluation (PD-021 / OQ-002)
  if (!driverProfile.current_lat || !driverProfile.current_lng) {
    return NextResponse.json(
      {
        code: "NO_GPS_LOCATION",
        message: "El conductor no tiene ubicación GPS registrada.",
      },
      { status: 400 }
    );
  }

  const lastGpsUpdate = driverProfile.location_updated_at
    ? new Date(driverProfile.location_updated_at).getTime()
    : 0;
  const isStale = Date.now() - lastGpsUpdate > GPS_STALENESS_THRESHOLD_MS;

  if (isStale && !proceed_with_stale_gps) {
    return NextResponse.json(
      {
        warning: "STALE_GPS",
        message:
          "La ubicación GPS del conductor fue actualizada hace más de 5 minutos. ¿Deseás continuar de todas formas?",
        location_updated_at: driverProfile.location_updated_at,
      },
      { status: 200 }
    );
  }

  // 5. Calculate final 3-leg distance & price (BR-011, BR-012, FR-009)
  const driverPos = {
    lat: Number(driverProfile.current_lat),
    lng: Number(driverProfile.current_lng),
  };
  const pickupPos = {
    lat: Number(service.pickup_lat),
    lng: Number(service.pickup_lng),
  };
  const destinationPos = {
    lat: Number(service.destination_lat),
    lng: Number(service.destination_lng),
  };

  // Get current pricing rate
  const { data: pricingData } = await (serviceClient as any)
    .from("pricing_config")
    .select("price_per_km")
    .eq("id", 1)
    .maybeSingle();

  const pricePerKm = Number(pricingData?.price_per_km ?? 1500);

  const distances = await calculateThreeLegDistances(
    driverPos,
    pickupPos,
    destinationPos
  );

  const breakdown = calculatePrice(distances, pricePerKm);

  // 6. Update service record (status -> assigned)
  const now = new Date().toISOString();
  const { data: updatedService, error: updateError } = await (serviceClient as any)
    .from("services")
    .update({
      status: "assigned",
      driver_id: driver_id,
      assigned_at: now,
      final_price: breakdown.totalPrice,
      final_pickup_km: breakdown.pickupKm,
      final_ride_km: breakdown.rideKm,
      final_return_km: breakdown.returnKm,
      price_per_km_at_time: pricePerKm,
    })
    .eq("id", id)
    .select()
    .single();

  if (updateError) {
    console.error("[assign:post] Service assignment error:", updateError.message);
    return NextResponse.json(
      { code: "UPDATE_ERROR", message: "Error al asignar conductor al servicio." },
      { status: 500 }
    );
  }

  // 7. Audit log note (log stale GPS warning note if applicable per PD-021)
  const auditNote = isStale
    ? `Driver assigned by ${role}. [WARNING: Stale GPS location proceeded]`
    : `Driver assigned by ${role}`;

  await (serviceClient as any).from("service_status_log").insert({
    service_id: id,
    from_status: "requested",
    to_status: "assigned",
    changed_by: user.id,
    notes: auditNote,
  });

  // 8. Send push notification to rider (FR-019 / AC-019-1)
  try {
    const driverName = driverProfile.profile?.full_name || undefined;
    const notificationPayload = getStatusNotificationContent("assigned", {
      driverName,
      serviceId: id,
    });
    if (notificationPayload && service.rider_id) {
      await sendPushToUser(service.rider_id, notificationPayload);
    }
  } catch (pushErr: any) {
    console.error("[assign:post] Push notification failed:", pushErr.message);
  }

  return NextResponse.json(
    {
      service: updatedService,
      finalPrice: breakdown,
      message: "Conductor asignado con éxito.",
    },
    { status: 200 }
  );
}

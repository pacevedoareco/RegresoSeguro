import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { calculatePrice } from "@/lib/pricing/pricing";
import {
  calculateThreeLegDistances,
  haversineDistanceKm,
} from "@/lib/services/routing";

const createServiceSchema = z.object({
  vehicle_id: z.string().uuid("Vehículo inválido"),
  pickup_address: z.string().min(1, "La dirección de origen es obligatoria"),
  pickup_lat: z.number().min(-90).max(90),
  pickup_lng: z.number().min(-180).max(180),
  destination_address: z
    .string()
    .min(1, "La dirección de destino es obligatoria"),
  destination_lat: z.number().min(-90).max(90),
  destination_lng: z.number().min(-180).max(180),
});

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "No autenticado." },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const includeHistory = searchParams.get("history") === "true";

  // 1. Find active service for this rider (requested, assigned, en_route, in_progress)
  const { data: activeService, error: activeError } = await (supabase as any)
    .from("services")
    .select("*, vehicle:vehicles(*), driver:profiles!services_driver_id_fkey(*)")
    .eq("rider_id", user.id)
    .not("status", "in", '("completed","cancelled")')
    .order("requested_at", { ascending: false })
    .maybeSingle();

  if (activeError) {
    console.error("[services:get] Error fetching active service:", activeError.message);
    return NextResponse.json(
      { code: "FETCH_ERROR", message: "Error al consultar servicios activos." },
      { status: 500 }
    );
  }

  // 2. If history requested, fetch completed & cancelled past services with ratings (FR-021)
  let pastServices = [];
  if (includeHistory) {
    const { data: historyData, error: historyError } = await (supabase as any)
      .from("services")
      .select("*, vehicle:vehicles(*), driver:profiles!services_driver_id_fkey(full_name, phone), ratings(*)")
      .eq("rider_id", user.id)
      .in("status", ["completed", "cancelled"])
      .order("requested_at", { ascending: false });

    if (!historyError && historyData) {
      pastServices = historyData;
    }
  }

  return NextResponse.json(
    {
      activeService: activeService || null,
      history: pastServices,
    },
    { status: 200 }
  );
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { code: "INVALID_JSON", message: "Cuerpo de la solicitud inválido." },
      { status: 400 }
    );
  }

  const parsed = createServiceSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.errors[0]?.message ?? "Datos inválidos.";
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message },
      { status: 400 }
    );
  }

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

  // 1. Check rider eligibility: suspended?
  const { data: profile } = await (supabase as any)
    .from("profiles")
    .select("id, is_suspended, strikes")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json(
      { code: "PROFILE_NOT_FOUND", message: "Perfil no encontrado." },
      { status: 404 }
    );
  }

  if (profile.is_suspended) {
    return NextResponse.json(
      {
        code: "ACCOUNT_SUSPENDED",
        message:
          "Tu cuenta se encuentra suspendida por acumulación de strikes. No podés solicitar viajes.",
      },
      { status: 403 }
    );
  }

  // 2. BR-001: Check if rider already has an active service
  const { data: existingActive } = await (supabase as any)
    .from("services")
    .select("id, status")
    .eq("rider_id", user.id)
    .not("status", "in", '("completed","cancelled")')
    .maybeSingle();

  if (existingActive) {
    return NextResponse.json(
      {
        code: "ACTIVE_SERVICE_EXISTS",
        message: "Ya tenés una solicitud o viaje activo en curso.",
        serviceId: (existingActive as any).id,
      },
      { status: 409 }
    );
  }

  const {
    vehicle_id,
    pickup_address,
    pickup_lat,
    pickup_lng,
    destination_address,
    destination_lat,
    destination_lng,
  } = parsed.data;

  // 3. Verify vehicle belongs to user
  const { data: vehicle } = await (supabase as any)
    .from("vehicles")
    .select("id, is_active")
    .eq("id", vehicle_id)
    .eq("rider_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!vehicle) {
    return NextResponse.json(
      {
        code: "INVALID_VEHICLE",
        message: "El vehículo seleccionado no es válido o fue eliminado.",
      },
      { status: 400 }
    );
  }

  // 4. Get online drivers (service client)
  const { data: onlineDrivers } = await (serviceClient as any)
    .from("driver_profiles")
    .select("id, current_lat, current_lng, availability, is_active")
    .eq("availability", "online")
    .eq("is_active", true);

  if (!onlineDrivers || onlineDrivers.length === 0) {
    return NextResponse.json(
      {
        code: "NO_DRIVERS_AVAILABLE",
        message:
          "No hay conductores disponibles en este momento. Intentá de nuevo más tarde.",
      },
      { status: 503 }
    );
  }

  // Find nearest driver for estimation
  let nearestDriver = onlineDrivers[0] as any;
  let minDistance = Infinity;

  for (const driver of onlineDrivers as any[]) {
    const dLat = Number(driver.current_lat ?? pickup_lat);
    const dLng = Number(driver.current_lng ?? pickup_lng);
    const dist = haversineDistanceKm(
      { lat: pickup_lat, lng: pickup_lng },
      { lat: dLat, lng: dLng }
    );
    if (dist < minDistance) {
      minDistance = dist;
      nearestDriver = driver;
    }
  }

  const driverPos = {
    lat: Number(nearestDriver.current_lat ?? pickup_lat),
    lng: Number(nearestDriver.current_lng ?? pickup_lng),
  };

  // 5. Get current pricing
  const { data: pricingData } = await (supabase as any)
    .from("pricing_config")
    .select("price_per_km")
    .eq("id", 1)
    .maybeSingle();

  const pricePerKm = Number(pricingData?.price_per_km ?? 1500);

  // 6. Calculate 3-leg distance & price
  const distances = await calculateThreeLegDistances(
    driverPos,
    { lat: pickup_lat, lng: pickup_lng },
    { lat: destination_lat, lng: destination_lng }
  );

  const breakdown = calculatePrice(distances, pricePerKm);

  // 7. Insert service record using serviceClient to bypass RLS restrictions safely
  const { data: newService, error: insertError } = await (serviceClient as any)
    .from("services")
    .insert({
      rider_id: user.id,
      vehicle_id,
      status: "requested",
      pickup_address,
      pickup_lat,
      pickup_lng,
      destination_address,
      destination_lat,
      destination_lng,
      estimated_price: breakdown.totalPrice,
      estimated_pickup_km: breakdown.pickupKm,
      estimated_ride_km: breakdown.rideKm,
      estimated_return_km: breakdown.returnKm,
      price_per_km_at_time: pricePerKm,
    })
    .select()
    .single();

  if (insertError) {
    console.error("[services:post] Insert error:", insertError.message);
    return NextResponse.json(
      { code: "SERVICE_CREATE_ERROR", message: "Error al registrar la solicitud." },
      { status: 500 }
    );
  }

  // 8. Record in audit log
  await (serviceClient as any).from("service_status_log").insert({
    service_id: newService.id,
    from_status: null,
    to_status: "requested",
    changed_by: user.id,
    notes: "Service requested by rider",
  });

  return NextResponse.json(
    {
      service: newService,
      estimate: breakdown,
      message: "Solicitud creada exitosamente.",
    },
    { status: 201 }
  );
}

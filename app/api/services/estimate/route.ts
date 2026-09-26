import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { calculatePrice } from "@/lib/pricing/pricing";
import {
  calculateThreeLegDistances,
  haversineDistanceKm,
} from "@/lib/services/routing";

const estimateSchema = z.object({
  pickup_lat: z.number().min(-90).max(90),
  pickup_lng: z.number().min(-180).max(180),
  destination_lat: z.number().min(-90).max(90),
  destination_lng: z.number().min(-180).max(180),
});

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

  const parsed = estimateSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.errors[0]?.message ?? "Coordenadas inválidas.";
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message },
      { status: 400 }
    );
  }

  const { pickup_lat, pickup_lng, destination_lat, destination_lng } =
    parsed.data;

  const supabase = await createClient();
  const serviceClient = await createServiceClient();

  // 1. Get current active pricing config
  const { data: pricingData } = await supabase
    .from("pricing_config")
    .select("price_per_km")
    .eq("id", 1)
    .maybeSingle();

  const pricePerKm = Number(pricingData?.price_per_km ?? 1500);

  // 2. Find online & active drivers (using service client to bypass RLS)
  const { data: onlineDrivers, error: driverError } = await serviceClient
    .from("driver_profiles")
    .select("id, current_lat, current_lng, availability, is_active")
    .eq("availability", "online")
    .eq("is_active", true);

  if (driverError) {
    console.error("[estimate] Error finding online drivers:", driverError.message);
  }

  if (!onlineDrivers || onlineDrivers.length === 0) {
    // BR-007 / PD-020 / OQ-001: No drivers available
    return NextResponse.json(
      {
        code: "NO_DRIVERS_AVAILABLE",
        message:
          "No hay conductores disponibles en este momento. Intentá de nuevo más tarde.",
      },
      { status: 503 }
    );
  }

  // 3. Find the nearest online driver to the pickup point
  let nearestDriver = onlineDrivers[0];
  let minDistance = Infinity;

  for (const driver of onlineDrivers) {
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

  const pickupPos = { lat: pickup_lat, lng: pickup_lng };
  const destPos = { lat: destination_lat, lng: destination_lng };

  // 4. Calculate the 3-leg distance
  const distances = await calculateThreeLegDistances(
    driverPos,
    pickupPos,
    destPos
  );

  // 5. Calculate price breakdown
  const breakdown = calculatePrice(distances, pricePerKm);

  return NextResponse.json({
    estimate: {
      ...breakdown,
      nearestDriverId: nearestDriver.id,
    },
  });
}

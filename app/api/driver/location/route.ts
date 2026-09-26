import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const locationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { code: "INVALID_JSON", message: "Cuerpo inválido." },
      { status: 400 }
    );
  }

  const parsed = locationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: "Coordenadas inválidas." },
      { status: 400 }
    );
  }

  const { lat, lng } = parsed.data;

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

  const { data, error } = await supabase
    .from("driver_profiles")
    .update({
      current_lat: lat,
      current_lng: lng,
      location_updated_at: new Date().toISOString(),
    })
    .eq("id", user.id)
    .select()
    .single();

  if (error) {
    console.error("[driver:location] Error updating location:", error.message);
    return NextResponse.json(
      { code: "UPDATE_ERROR", message: "No se pudo actualizar la ubicación." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, location: { lat, lng } }, { status: 200 });
}

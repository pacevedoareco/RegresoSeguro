import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const createVehicleSchema = z.object({
  license_plate: z
    .string()
    .min(1, "La patente es obligatoria")
    .max(20, "Patente demasiado larga")
    .transform((val) => val.trim().toUpperCase()),
  make_model: z
    .string()
    .min(1, "Marca y modelo son obligatorios")
    .max(100, "Marca y modelo demasiado largos")
    .transform((val) => val.trim()),
  color: z
    .string()
    .min(1, "El color es obligatorio")
    .max(50, "Color demasiado largo")
    .transform((val) => val.trim()),
});

export async function GET() {
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
    .from("vehicles")
    .select("*")
    .eq("rider_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[vehicles:get] Error fetching vehicles:", error.message);
    return NextResponse.json(
      { code: "FETCH_ERROR", message: "No se pudieron obtener los vehículos." },
      { status: 500 }
    );
  }

  return NextResponse.json({ vehicles: data ?? [] }, { status: 200 });
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

  const parsed = createVehicleSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.errors[0]?.message ?? "Datos inválidos.";
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message },
      { status: 400 }
    );
  }

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

  const { license_plate, make_model, color } = parsed.data;

  // Check if active vehicle with same plate exists for this rider
  const { data: existingActive } = await supabase
    .from("vehicles")
    .select("id, is_active")
    .eq("rider_id", user.id)
    .eq("license_plate", license_plate)
    .maybeSingle();

  if (existingActive) {
    if (existingActive.is_active) {
      return NextResponse.json(
        {
          code: "DUPLICATE_PLATE",
          message: "Ya tenés un vehículo registrado con esta patente.",
        },
        { status: 409 }
      );
    } else {
      // Reactivate previously soft-deleted vehicle and update make_model and color
      const { data: reactivated, error: updateError } = await supabase
        .from("vehicles")
        .update({
          make_model,
          color,
          is_active: true,
        })
        .eq("id", existingActive.id)
        .select()
        .single();

      if (updateError) {
        console.error(
          "[vehicles:post] Error reactivating vehicle:",
          updateError.message
        );
        return NextResponse.json(
          {
            code: "SAVE_ERROR",
            message: "No se pudo guardar el vehículo.",
          },
          { status: 500 }
        );
      }

      return NextResponse.json({ vehicle: reactivated }, { status: 201 });
    }
  }

  const { data: newVehicle, error: insertError } = await supabase
    .from("vehicles")
    .insert({
      rider_id: user.id,
      license_plate,
      make_model,
      color,
      is_active: true,
    })
    .select()
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json(
        {
          code: "DUPLICATE_PLATE",
          message: "Ya tenés un vehículo registrado con esta patente.",
        },
        { status: 409 }
      );
    }
    console.error(
      "[vehicles:post] Error inserting vehicle:",
      insertError.message
    );
    return NextResponse.json(
      { code: "SAVE_ERROR", message: "No se pudo guardar el vehículo." },
      { status: 500 }
    );
  }

  return NextResponse.json({ vehicle: newVehicle }, { status: 201 });
}

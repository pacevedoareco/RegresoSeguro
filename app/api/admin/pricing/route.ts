import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

// GET /api/admin/pricing - View current pricing configuration (Operator and Super-Admin)
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

  const { data: profile } = await (supabase as any)
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role;
  if (role !== "operator" && role !== "super_admin") {
    return NextResponse.json(
      { code: "FORBIDDEN", message: "Acceso denegado." },
      { status: 403 }
    );
  }

  const serviceClient = await createServiceClient();
  const { data: pricing, error } = await (serviceClient as any)
    .from("pricing_config")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error || !pricing) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "Configuración de precios no encontrada." },
      { status: 404 }
    );
  }

  return NextResponse.json({ pricing }, { status: 200 });
}

// PUT /api/admin/pricing - Update per-km rate (Super-Admin only per BR-028 / FR-024)
export async function PUT(request: NextRequest) {
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

  const { data: profile } = await (supabase as any)
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "super_admin") {
    return NextResponse.json(
      {
        code: "FORBIDDEN",
        message: "Solo el Super-Admin puede modificar la configuración de tarifas.",
      },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { code: "INVALID_JSON", message: "Cuerpo de solicitud inválido." },
      { status: 400 }
    );
  }

  const pricePerKm = Number((body as any)?.price_per_km);
  if (isNaN(pricePerKm) || pricePerKm <= 0) {
    return NextResponse.json(
      {
        code: "VALIDATION_ERROR",
        message: "El precio por kilómetro debe ser un número positivo mayor a cero.",
      },
      { status: 400 }
    );
  }

  const serviceClient = await createServiceClient();
  const { data: updatedPricing, error: updateError } = await (serviceClient as any)
    .from("pricing_config")
    .update({
      price_per_km: pricePerKm,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq("id", 1)
    .select()
    .single();

  if (updateError) {
    console.error("[admin:pricing:put] Error updating pricing config:", updateError.message);
    return NextResponse.json(
      { code: "DB_ERROR", message: "Error al actualizar la tarifa." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      pricing: updatedPricing,
      message: "Tarifa actualizada con éxito.",
    },
    { status: 200 }
  );
}

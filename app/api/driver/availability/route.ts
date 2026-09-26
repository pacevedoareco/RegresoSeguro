import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const availabilitySchema = z.object({
  availability: z.enum(["online", "offline"]),
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

  const { data: driverProfile, error } = await supabase
    .from("driver_profiles")
    .select("*, profile:profiles(*)")
    .eq("id", user.id)
    .single();

  if (error || !driverProfile) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "Perfil de conductor no encontrado." },
      { status: 404 }
    );
  }

  // Also query active service if any
  const { data: activeJob } = await supabase
    .from("services")
    .select("*, vehicle:vehicles(*), rider:profiles!services_rider_id_fkey(*)")
    .eq("driver_id", user.id)
    .not("status", "in", '("completed","cancelled")')
    .maybeSingle();

  return NextResponse.json(
    {
      driverProfile,
      activeJob: activeJob || null,
    },
    { status: 200 }
  );
}

export async function PATCH(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { code: "INVALID_JSON", message: "Cuerpo inválido." },
      { status: 400 }
    );
  }

  const parsed = availabilitySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: "Estado de disponibilidad inválido." },
      { status: 400 }
    );
  }

  const { availability } = parsed.data;

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

  // If attempting to go offline, check if driver has active assignments
  if (availability === "offline") {
    const { data: activeJob } = await serviceClient
      .from("services")
      .select("id, status")
      .eq("driver_id", user.id)
      .not("status", "in", '("completed","cancelled")')
      .maybeSingle();

    if (activeJob) {
      return NextResponse.json(
        {
          code: "ACTIVE_SERVICE_RUNNING",
          message:
            "No podés desconectarte mientras tengas un viaje asignado o en curso.",
        },
        { status: 409 }
      );
    }
  }

  const { data, error } = await (supabase as any)
    .from("driver_profiles")
    .update({
      availability,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id)
    .select()
    .single();

  if (error) {
    console.error("[driver:availability] Error updating:", error.message);
    return NextResponse.json(
      { code: "UPDATE_ERROR", message: "Error al cambiar disponibilidad." },
      { status: 500 }
    );
  }

  return NextResponse.json({ driverProfile: data }, { status: 200 });
}

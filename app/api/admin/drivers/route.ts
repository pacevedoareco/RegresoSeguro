import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

// Schema for promoting a user to driver (AC-023-1, OQ-003)
const promoteDriverSchema = z.object({
  user_id: z.string().uuid("ID de usuario inválido"),
  dni: z.string().min(6, "DNI debe tener al menos 6 caracteres"),
  license_number: z.string().min(4, "Número de licencia requerido"),
  license_category: z.string().min(1, "Categoría de licencia requerida"),
  phone: z.string().min(6, "Teléfono requerido").optional(),
});

// Schema for editing an existing driver profile
const updateDriverSchema = z.object({
  driver_id: z.string().uuid("ID de conductor inválido"),
  dni: z.string().min(6, "DNI debe tener al menos 6 caracteres").optional(),
  license_number: z.string().min(4, "Número de licencia requerido").optional(),
  license_category: z.string().min(1, "Categoría de licencia requerida").optional(),
  is_active: z.boolean().optional(),
  phone: z.string().min(6, "Teléfono requerido").optional(),
  full_name: z.string().min(2, "Nombre requerido").optional(),
});

// GET /api/admin/drivers - List all drivers and pending applications
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

  // 1. Fetch all drivers with their profile info
  const { data: drivers, error: driversError } = await (serviceClient as any)
    .from("driver_profiles")
    .select("*, profile:profiles!driver_profiles_id_fkey(*)")
    .order("created_at", { ascending: false });

  if (driversError) {
    console.error("[admin:drivers:get] Drivers query error:", driversError.message);
    return NextResponse.json(
      { code: "DB_ERROR", message: "Error al obtener conductores." },
      { status: 500 }
    );
  }

  // 2. Fetch pending driver applications (profiles with registered_as_driver = true and role = 'rider')
  const { data: pendingApplications, error: pendingError } = await (serviceClient as any)
    .from("profiles")
    .select("*")
    .eq("registered_as_driver", true)
    .eq("role", "rider")
    .order("created_at", { ascending: false });

  if (pendingError) {
    console.error("[admin:drivers:get] Pending applications error:", pendingError.message);
  }

  return NextResponse.json(
    {
      drivers: drivers || [],
      pendingApplications: pendingApplications || [],
    },
    { status: 200 }
  );
}

// POST /api/admin/drivers - Promote registered applicant to driver (Super-Admin only)
export async function POST(request: NextRequest) {
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
        message: "Solo el Super-Admin puede gestionar y dar de alta conductores.",
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

  const parsed = promoteDriverSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.errors[0]?.message ?? "Datos inválidos.";
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message },
      { status: 400 }
    );
  }

  const { user_id, dni, license_number, license_category, phone } = parsed.data;
  const serviceClient = await createServiceClient();

  // 1. Create or upsert driver_profiles record
  const { data: newDriverProfile, error: driverError } = await (serviceClient as any)
    .from("driver_profiles")
    .upsert({
      id: user_id,
      dni,
      license_number,
      license_category,
      is_active: true,
      availability: "offline",
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (driverError) {
    console.error("[admin:drivers:post] Driver profile creation error:", driverError.message);
    return NextResponse.json(
      { code: "DB_ERROR", message: "Error al crear perfil de conductor." },
      { status: 500 }
    );
  }

  // 2. Update profiles role to 'driver' and optionally phone
  const profileUpdates: Record<string, any> = {
    role: "driver",
    updated_at: new Date().toISOString(),
  };
  if (phone) {
    profileUpdates.phone = phone;
  }

  const { data: updatedProfile, error: profileError } = await (serviceClient as any)
    .from("profiles")
    .update(profileUpdates)
    .eq("id", user_id)
    .select()
    .single();

  if (profileError) {
    console.error("[admin:drivers:post] Profile role update error:", profileError.message);
  }

  return NextResponse.json(
    {
      driver: { ...newDriverProfile, profile: updatedProfile },
      message: "Conductor activado y promovido con éxito.",
    },
    { status: 201 }
  );
}

// PATCH /api/admin/drivers - Update driver profile / toggle active status (Super-Admin only)
export async function PATCH(request: NextRequest) {
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
        message: "Solo el Super-Admin puede modificar datos de conductores.",
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

  const parsed = updateDriverSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.errors[0]?.message ?? "Datos inválidos.";
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message },
      { status: 400 }
    );
  }

  const { driver_id, dni, license_number, license_category, is_active, phone, full_name } =
    parsed.data;
  const serviceClient = await createServiceClient();

  const driverUpdates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };
  if (dni !== undefined) driverUpdates.dni = dni;
  if (license_number !== undefined) driverUpdates.license_number = license_number;
  if (license_category !== undefined) driverUpdates.license_category = license_category;
  if (is_active !== undefined) driverUpdates.is_active = is_active;

  const { data: updatedDriverProfile, error: driverErr } = await (serviceClient as any)
    .from("driver_profiles")
    .update(driverUpdates)
    .eq("id", driver_id)
    .select()
    .single();

  if (driverErr) {
    console.error("[admin:drivers:patch] Error updating driver profile:", driverErr.message);
    return NextResponse.json(
      { code: "DB_ERROR", message: "Error al actualizar perfil del conductor." },
      { status: 500 }
    );
  }

  // Update base profile fields if provided
  if (phone !== undefined || full_name !== undefined) {
    const baseUpdates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (phone !== undefined) baseUpdates.phone = phone;
    if (full_name !== undefined) baseUpdates.full_name = full_name;

    await (serviceClient as any)
      .from("profiles")
      .update(baseUpdates)
      .eq("id", driver_id);
  }

  return NextResponse.json(
    {
      driver: updatedDriverProfile,
      message: "Datos del conductor actualizados correctamente.",
    },
    { status: 200 }
  );
}

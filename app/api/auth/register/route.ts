import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { sendRegistrationConfirmation } from "@/lib/resend/emails";

const registerSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres"),
  full_name: z
    .string()
    .min(1, "El nombre es obligatorio")
    .max(200, "Nombre demasiado largo"),
  registered_as_driver: z.boolean().optional().default(false),
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

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.errors[0]?.message ?? "Datos inválidos.";
    return NextResponse.json({ code: "VALIDATION_ERROR", message }, { status: 400 });
  }

  const { email, password, full_name, registered_as_driver } = parsed.data;

  // Validate presence of required service role configuration
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error(
      "[register] Missing environment variables: SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL is not set."
    );
    return NextResponse.json(
      {
        code: "SERVER_CONFIGURATION_ERROR",
        message: "Error de configuración del servidor. Verificá las variables de entorno en producción.",
      },
      { status: 500 }
    );
  }

  // Use service client so we can set user metadata (full_name, registered_as_driver)
  const supabase = await createServiceClient();

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    user_metadata: {
      full_name,
      registered_as_driver,
    },
    email_confirm: true, // Auto-confirm email in Supabase so user can log in immediately
  });

  if (error) {
    // AC-001-3: Duplicate email returns clear error
    if (
      error.message.toLowerCase().includes("already registered") ||
      error.message.toLowerCase().includes("user already exists")
    ) {
      return NextResponse.json(
        {
          code: "EMAIL_IN_USE",
          message:
            "Ya existe una cuenta con ese correo. Intentá iniciar sesión.",
        },
        { status: 409 }
      );
    }
    // Log server-side only — never surface raw error to client
    console.error("[register] Supabase auth error:", error.message);
    return NextResponse.json(
      {
        code: "REGISTRATION_FAILED",
        message: "No se pudo crear la cuenta. Intentá de nuevo más tarde.",
      },
      { status: 500 }
    );
  }

  // Send confirmation email via Resend (server-side only — AC-001-2)
  try {
    await sendRegistrationConfirmation(email, full_name);
  } catch (emailError) {
    // Email failure is not fatal — log and continue
    console.error("[register] Failed to send confirmation email:", emailError);
  }

  return NextResponse.json(
    { userId: data.user?.id, message: "Cuenta creada exitosamente." },
    { status: 201 }
  );
}

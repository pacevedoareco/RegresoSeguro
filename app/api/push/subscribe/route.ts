import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const subscribeSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url("Endpoint URL inválido"),
    keys: z.object({
      p256dh: z.string().min(1, "Clave p256dh requerida"),
      auth: z.string().min(1, "Clave auth requerida"),
    }),
  }),
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

  const parsed = subscribeSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.errors[0]?.message ?? "Datos de suscripción inválidos.";
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message },
      { status: 400 }
    );
  }

  const { subscription } = parsed.data;

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

  const serviceClient = await createServiceClient();

  // Upsert subscription based on unique endpoint
  const { error } = await (serviceClient as any)
    .from("push_subscriptions")
    .upsert(
      {
        user_id: user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" }
    );

  if (error) {
    console.error("[push:subscribe] DB error saving subscription:", error.message);
    return NextResponse.json(
      { code: "DB_ERROR", message: "No se pudo guardar la suscripción push." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { message: "Suscripción guardada con éxito." },
    { status: 200 }
  );
}

export async function DELETE(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { code: "INVALID_JSON", message: "Cuerpo de la solicitud inválido." },
      { status: 400 }
    );
  }

  const schema = z.object({
    endpoint: z.string().url("Endpoint URL inválido"),
  });

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: "Endpoint requerido." },
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

  const serviceClient = await createServiceClient();

  const { error } = await (serviceClient as any)
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", parsed.data.endpoint)
    .eq("user_id", user.id);

  if (error) {
    console.error("[push:delete] DB error deleting subscription:", error.message);
    return NextResponse.json(
      { code: "DB_ERROR", message: "Error al desuscribir." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { message: "Suscripción eliminada con éxito." },
    { status: 200 }
  );
}

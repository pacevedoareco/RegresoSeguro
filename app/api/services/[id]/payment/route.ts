import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getPaymentMethodLabel, isDigitalPayment } from "@/lib/payments/payments";

// POST /api/services/[id]/payment - Simulated digital payment confirmation (HU-12, PD-026)
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { code: "INVALID_ID", message: "ID de servicio inválido." },
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
  const { data: service, error: serviceError } = await (serviceClient as any)
    .from("services")
    .select("id, rider_id, status, final_price, payment_method, payment_status")
    .eq("id", id)
    .single();

  if (serviceError || !service) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "Servicio no encontrado." },
      { status: 404 }
    );
  }

  if (service.rider_id !== user.id) {
    return NextResponse.json(
      { code: "FORBIDDEN", message: "Solo el cliente del servicio puede registrar el pago." },
      { status: 403 }
    );
  }

  if (!isDigitalPayment(service.payment_method)) {
    return NextResponse.json(
      {
        code: "NOT_DIGITAL",
        message: "El pago en efectivo se registra al finalizar el servicio.",
      },
      { status: 400 }
    );
  }

  if (service.payment_status === "paid") {
    return NextResponse.json(
      { code: "ALREADY_PAID", message: "Este servicio ya fue pagado." },
      { status: 409 }
    );
  }

  // The amount to pay is the final price, which is fixed at assignment (BR-013)
  if (service.status === "cancelled" || service.status === "requested" || service.final_price == null) {
    return NextResponse.json(
      {
        code: "INVALID_STATE",
        message: "El pago se habilita una vez asignado el chofer.",
      },
      { status: 409 }
    );
  }

  const paidAt = new Date().toISOString();
  const { data: updatedService, error: updateError } = await (serviceClient as any)
    .from("services")
    .update({ payment_status: "paid", paid_at: paidAt })
    .eq("id", id)
    .eq("payment_status", "pending")
    .select()
    .single();

  if (updateError || !updatedService) {
    console.error("[payment:post] Update error:", updateError?.message);
    return NextResponse.json(
      { code: "UPDATE_ERROR", message: "No se pudo registrar el pago." },
      { status: 500 }
    );
  }

  await (serviceClient as any).from("service_status_log").insert({
    service_id: id,
    from_status: service.status,
    to_status: service.status,
    changed_by: user.id,
    notes: `Pago simulado (${getPaymentMethodLabel(service.payment_method)})`,
  });

  return NextResponse.json(
    { service: updatedService, message: "Pago registrado con éxito (simulado)." },
    { status: 200 }
  );
}

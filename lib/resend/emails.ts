import { Resend } from "resend";

const FROM = process.env.RESEND_FROM_EMAIL ?? "noreply@regresoseguro.com";

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new Resend(apiKey);
}

export async function sendRegistrationConfirmation(
  email: string,
  fullName: string
) {
  const resend = getResendClient();
  if (!resend) {
    console.warn("[resend] RESEND_API_KEY not configured. Skipping confirmation email.");
    return;
  }
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Bienvenido a Regreso Seguro",
    html: registrationEmailHtml(fullName),
  });
}

export async function sendStrikeWarning(
  email: string,
  fullName: string,
  strikeCount: number
) {
  const resend = getResendClient();
  if (!resend) {
    console.warn("[resend] RESEND_API_KEY not configured. Skipping strike warning email.");
    return;
  }
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Regreso Seguro — Aviso de cancelación (${strikeCount}/3)`,
    html: strikeWarningEmailHtml(fullName, strikeCount),
  });
}

function registrationEmailHtml(fullName: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><title>Bienvenido a Regreso Seguro</title></head>
<body style="font-family:sans-serif;color:#1f2937;max-width:560px;margin:0 auto;padding:24px">
  <h1 style="color:#1e40af;font-size:22px">¡Bienvenido/a, ${escapeHtml(fullName)}!</h1>
  <p>Tu cuenta en <strong>Regreso Seguro</strong> fue creada exitosamente.</p>
  <p>Ahora podés solicitar un servicio: un conductor profesional irá a tu ubicación y manejará tu propio auto hasta tu destino.</p>
  <p style="color:#6b7280;font-size:13px;margin-top:32px">Si no creaste esta cuenta, podés ignorar este correo.</p>
</body>
</html>`;
}

function strikeWarningEmailHtml(fullName: string, strikeCount: number): string {
  const remaining = 3 - strikeCount;
  const suspensionWarning =
    remaining === 0
      ? `<p style="color:#dc2626;font-weight:bold">Tu cuenta ha sido suspendida. No podrás solicitar nuevos servicios.</p>`
      : `<p>Te quedan <strong>${remaining}</strong> cancelación${remaining === 1 ? "" : "es"} antes de que tu cuenta sea suspendida.</p>`;

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><title>Aviso de cancelación — Regreso Seguro</title></head>
<body style="font-family:sans-serif;color:#1f2937;max-width:560px;margin:0 auto;padding:24px">
  <h1 style="color:#b45309;font-size:22px">Aviso de cancelación</h1>
  <p>Hola, <strong>${escapeHtml(fullName)}</strong>.</p>
  <p>Cancelaste un servicio después de haber sido asignado a un conductor. Esto suma <strong>1 strike</strong> a tu cuenta.</p>
  <p>Strikes acumulados: <strong>${strikeCount}/3</strong></p>
  ${suspensionWarning}
  <p style="color:#6b7280;font-size:13px;margin-top:32px">Si creés que esto es un error, contactá al soporte.</p>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

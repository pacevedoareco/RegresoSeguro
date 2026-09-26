"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const origin =
        typeof window !== "undefined"
          ? window.location.origin
          : "https://regresoseguro.vercel.app";

      const redirectTo = `${origin}/auth/callback?next=/auth/reset-password`;

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        {
          redirectTo,
        }
      );

      if (resetError) {
        setError("No pudimos enviar el correo de recuperación. Intentá de nuevo más tarde.");
        return;
      }

      setSuccess(true);
    } catch {
      setError("Error de red. Verificá tu conexión e intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm">
      <h1 className="mb-1 text-2xl font-bold text-gray-900">
        Recuperar contraseña
      </h1>
      <p className="mb-6 text-sm text-gray-500">
        Ingresá tu correo y te enviaremos un enlace para restablecer tu contraseña.
      </p>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {success ? (
        <div className="space-y-4">
          <div
            role="status"
            className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800"
          >
            <p className="font-semibold mb-1">¡Correo enviado!</p>
            <p className="text-xs text-emerald-700">
              Te enviamos las instrucciones a <strong>{email}</strong>. Revisá tu bandeja de entrada o spam y hacé clic en el enlace.
            </p>
          </div>
          <Link
            href="/auth/login"
            className="block text-center w-full rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200 transition"
          >
            Volver a Iniciar sesión
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="juan@ejemplo.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Enviando enlace..." : "Enviar enlace de recuperación"}
          </button>

          <div className="text-center mt-2">
            <Link
              href="/auth/login"
              className="text-xs font-medium text-blue-600 hover:underline"
            >
              ← Volver a Iniciar sesión
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Suspense fallback={<div className="text-sm text-gray-500">Cargando...</div>}>
        <ForgotPasswordForm />
      </Suspense>
    </main>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface PricingConfig {
  id: number;
  price_per_km: number;
  updated_at: string;
}

export default function PricingAdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [pricing, setPricing] = useState<PricingConfig | null>(null);
  const [newRate, setNewRate] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fetchPricingData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/pricing");
      if (res.ok) {
        const data = await res.json();
        setPricing(data.pricing);
        setNewRate(data.pricing.price_per_km.toString());
      }
    } catch (err) {
      console.error("Error loading pricing config:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const checkRole = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login");
        return;
      }

      const { data: profile } = await (supabase as any)
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!profile || (profile.role !== "operator" && profile.role !== "super_admin")) {
        router.push("/");
        return;
      }

      setUserRole(profile.role);
      fetchPricingData();
    };

    checkRole();
  }, [router, fetchPricingData]);

  const handleSavePricing = async (e: React.FormEvent) => {
    e.preventDefault();
    const rateNum = Number(newRate);
    if (isNaN(rateNum) || rateNum <= 0) {
      setMessage({
        text: "Ingresá un monto válido mayor a $0 por kilómetro.",
        type: "error",
      });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price_per_km: rateNum }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage({
          text: data.message || "Error al actualizar la tarifa.",
          type: "error",
        });
      } else {
        setPricing(data.pricing);
        setMessage({
          text: "Tarifa actualizada con éxito. Aplica inmediatamente a nuevas solicitudes.",
          type: "success",
        });
      }
    } catch {
      setMessage({
        text: "Error de red al intentar guardar la tarifa.",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const isSuperAdmin = userRole === "super_admin";

  if (loading) {
    return (
      <div className="text-center py-24 text-gray-500 font-medium">
        Cargando configuración de tarifas...
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">
          Configuración de Precios y Tarifas
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Definí el valor por kilómetro aplicado a los 3 tramos de servicio (búsqueda, traslado y regreso).
        </p>
      </div>

      {/* Regla de negocio explicativa */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 text-xs text-blue-800 space-y-2">
        <div className="font-bold text-sm text-blue-900 flex items-center gap-2">
          <span>ℹ️</span> Modelo de Precios por Kilómetro (BR-012 / BR-022 / BR-023)
        </div>
        <p>
          El cálculo de costo utiliza una tarifa única global para los 3 tramos:
        </p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li><strong>Tramo 1 (Pickup):</strong> Distancia desde la posición del conductor hasta el punto de origen.</li>
          <li><strong>Tramo 2 (Traslado):</strong> Distancia desde el origen hasta el destino del pasajero.</li>
          <li><strong>Tramo 3 (Retorno):</strong> Distancia de regreso del conductor a su punto de partida.</li>
        </ul>
        <p className="pt-1 text-blue-900 font-medium">
          Los cambios de tarifa impactan exclusivamente en nuevas estimaciones y asignaciones futuras; los servicios en curso o históricos conservan el valor fijado al momento de su cálculo.
        </p>
      </div>

      {/* Formulario de actualización de tarifa */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-base font-bold text-gray-900 mb-4">
          Tarifa Base por Kilómetro
        </h2>

        {message && (
          <div
            className={`p-4 rounded-xl text-xs font-semibold mb-6 ${
              message.type === "success"
                ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                : "bg-rose-50 border border-rose-200 text-rose-700"
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSavePricing} className="space-y-6">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Precio por Kilómetro (ARS)
            </label>
            <div className="relative max-w-xs">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 font-bold text-sm">
                $
              </span>
              <input
                type="number"
                step="50"
                min="100"
                required
                disabled={!isSuperAdmin || saving}
                value={newRate}
                onChange={(e) => setNewRate(e.target.value)}
                className="w-full pl-8 pr-4 py-2.5 text-sm font-bold text-gray-900 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-hidden disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="1500"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              Última actualización:{" "}
              {pricing?.updated_at
                ? new Date(pricing.updated_at).toLocaleString("es-AR")
                : "Sin registro"}
            </p>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-gray-100">
            <div className="text-xs text-gray-500">
              {!isSuperAdmin && (
                <span className="text-amber-600 font-semibold">
                  ⚠️ Solo usuarios con rol Super-Admin pueden editar esta tarifa.
                </span>
              )}
            </div>

            {isSuperAdmin && (
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition disabled:opacity-50"
              >
                {saving ? "Guardando..." : "Guardar Tarifa"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

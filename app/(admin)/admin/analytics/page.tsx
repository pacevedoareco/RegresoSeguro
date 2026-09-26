"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface MetricsData {
  totalRequests: number;
  byStatus: {
    requested: number;
    assigned: number;
    en_route: number;
    in_progress: number;
    completed: number;
    cancelled: number;
  };
  totalInProgress: number;
  avgResponseTimeMinutes: number | null;
  avgRating: number | null;
  totalRatings: number;
  cancellationRate: number;
}

export default function AnalyticsAdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);

  // Date filters (default last 30 days) — initialized once via useState to avoid impure Date.now() during render
  const [fromDate, setFromDate] = useState<string>(() => {
    const d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return d.toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState<string>(() =>
    new Date().toISOString().split("T")[0]
  );

  const fetchAnalytics = useCallback(async (from?: string, to?: string) => {
    setLoading(true);
    try {
      let url = "/api/admin/analytics";
      const params = new URLSearchParams();
      if (from) params.set("from", new Date(from).toISOString());
      if (to) {
        const toObj = new Date(to);
        toObj.setHours(23, 59, 59, 999);
        params.set("to", toObj.toISOString());
      }
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setMetrics(data.metrics);
      } else if (res.status === 403) {
        router.push("/admin");
      }
    } catch (err) {
      console.error("Error fetching analytics:", err);
    } finally {
      setLoading(false);
    }
  }, [router]);

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

      if (!profile || profile.role !== "super_admin") {
        // Operator cannot access analytics page (BR-028 / AC-025)
        router.push("/admin");
        return;
      }

      setIsSuperAdmin(true);
      fetchAnalytics(fromDate, toDate);
    };

    checkRole();
  }, [router, fetchAnalytics, fromDate, toDate]);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAnalytics(fromDate, toDate);
  };

  if (!isSuperAdmin) {
    return (
      <div className="text-center py-24 text-gray-400 font-medium text-sm">
        Verificando permisos de Super-Admin...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            Panel de Analítica Operativa
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Indicadores clave de rendimiento, tiempos de respuesta y satisfacción (FR-025).
          </p>
        </div>

        {/* Date Filter */}
        <form
          onSubmit={handleFilterSubmit}
          className="bg-white p-2.5 rounded-2xl border border-gray-200 shadow-xs flex flex-wrap items-center gap-2 text-xs font-semibold"
        >
          <div className="flex items-center gap-1.5">
            <span className="text-gray-400">Desde:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-800 outline-hidden"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-gray-400">Hasta:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-800 outline-hidden"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50"
          >
            Filtrar
          </button>
        </form>
      </div>

      {loading && !metrics ? (
        <div className="text-center py-20 text-gray-400 text-sm">
          Calculando métricas...
        </div>
      ) : metrics ? (
        <>
          {/* Stat Cards Grid (5 Core Metrics per FR-025) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* 1. Total Requests */}
            <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs space-y-1">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Total Solicitudes
              </span>
              <div className="text-3xl font-black text-gray-900">
                {metrics.totalRequests}
              </div>
              <p className="text-[11px] text-gray-500">
                En el período seleccionado
              </p>
            </div>

            {/* 2. Completed Services */}
            <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs space-y-1">
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
                Viajes Completados
              </span>
              <div className="text-3xl font-black text-emerald-700">
                {metrics.byStatus.completed}
              </div>
              <p className="text-[11px] text-emerald-600/80">
                {metrics.totalRequests > 0
                  ? `${((metrics.byStatus.completed / metrics.totalRequests) * 100).toFixed(0)}% del total`
                  : "0%"}
              </p>
            </div>

            {/* 3. Cancellation Rate */}
            <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs space-y-1">
              <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">
                Tasa Cancelación
              </span>
              <div className="text-3xl font-black text-rose-700">
                {metrics.cancellationRate}%
              </div>
              <p className="text-[11px] text-rose-600/80">
                {metrics.byStatus.cancelled} cancelaciones
              </p>
            </div>

            {/* 4. Average Response Time */}
            <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs space-y-1">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                Tiempo Asignación
              </span>
              <div className="text-3xl font-black text-blue-700">
                {metrics.avgResponseTimeMinutes !== null
                  ? `${metrics.avgResponseTimeMinutes} min`
                  : "—"}
              </div>
              <p className="text-[11px] text-blue-600/80">
                Promedio Solicitud → Asignado
              </p>
            </div>

            {/* 5. CSAT / Average Rating */}
            <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs space-y-1">
              <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">
                Satisfacción (CSAT)
              </span>
              <div className="text-3xl font-black text-amber-600 flex items-center gap-1">
                <span>★</span>
                <span>
                  {metrics.avgRating !== null ? metrics.avgRating.toFixed(1) : "5.0"}
                </span>
              </div>
              <p className="text-[11px] text-amber-600/80">
                {metrics.totalRatings} calificaciones
              </p>
            </div>
          </div>

          {/* Breakdown Table by Status */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">
                Distribución de Estados de Servicio
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Desglose detallado del volumen de viajes en el ciclo de vida del servicio.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600 text-xs uppercase font-semibold border-b">
                  <tr>
                    <th className="py-3 px-5">Estado</th>
                    <th className="py-3 px-5">Cantidad</th>
                    <th className="py-3 px-5">Porcentaje</th>
                    <th className="py-3 px-5">Descripción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr className="hover:bg-gray-50">
                    <td className="py-3.5 px-5 font-semibold text-emerald-700">
                      ✅ Completado
                    </td>
                    <td className="py-3.5 px-5 font-extrabold text-gray-900">
                      {metrics.byStatus.completed}
                    </td>
                    <td className="py-3.5 px-5 text-gray-600 font-medium">
                      {metrics.totalRequests > 0
                        ? `${((metrics.byStatus.completed / metrics.totalRequests) * 100).toFixed(1)}%`
                        : "0%"}
                    </td>
                    <td className="py-3.5 px-5 text-xs text-gray-500">
                      Viaje finalizado exitosamente en destino
                    </td>
                  </tr>

                  <tr className="hover:bg-gray-50">
                    <td className="py-3.5 px-5 font-semibold text-rose-700">
                      ❌ Cancelado
                    </td>
                    <td className="py-3.5 px-5 font-extrabold text-gray-900">
                      {metrics.byStatus.cancelled}
                    </td>
                    <td className="py-3.5 px-5 text-gray-600 font-medium">
                      {metrics.totalRequests > 0
                        ? `${((metrics.byStatus.cancelled / metrics.totalRequests) * 100).toFixed(1)}%`
                        : "0%"}
                    </td>
                    <td className="py-3.5 px-5 text-xs text-gray-500">
                      Cancelado por pasajero u operador
                    </td>
                  </tr>

                  <tr className="hover:bg-gray-50">
                    <td className="py-3.5 px-5 font-semibold text-blue-700">
                      🚗 En Curso (Traslado / En camino)
                    </td>
                    <td className="py-3.5 px-5 font-extrabold text-gray-900">
                      {metrics.byStatus.en_route + metrics.byStatus.in_progress}
                    </td>
                    <td className="py-3.5 px-5 text-gray-600 font-medium">
                      {metrics.totalRequests > 0
                        ? `${(((metrics.byStatus.en_route + metrics.byStatus.in_progress) / metrics.totalRequests) * 100).toFixed(1)}%`
                        : "0%"}
                    </td>
                    <td className="py-3.5 px-5 text-xs text-gray-500">
                      Chofer viajando al origen o conduciendo el vehículo
                    </td>
                  </tr>

                  <tr className="hover:bg-gray-50">
                    <td className="py-3.5 px-5 font-semibold text-amber-700">
                      ⏳ Pendiente de Asignación
                    </td>
                    <td className="py-3.5 px-5 font-extrabold text-gray-900">
                      {metrics.byStatus.requested}
                    </td>
                    <td className="py-3.5 px-5 text-gray-600 font-medium">
                      {metrics.totalRequests > 0
                        ? `${((metrics.byStatus.requested / metrics.totalRequests) * 100).toFixed(1)}%`
                        : "0%"}
                    </td>
                    <td className="py-3.5 px-5 text-xs text-gray-500">
                      Aguardando que un operador asigne chofer
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

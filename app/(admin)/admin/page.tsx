"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/pricing/pricing";
import type { Service, Vehicle, Profile, DriverProfile } from "@/types/database";

type EnrichedDriver = DriverProfile & {
  profile?: {
    full_name: string;
    phone: string | null;
    average_rating: number | null;
    rating_count: number;
  };
  is_busy?: boolean;
};

type PendingRequest = Service & {
  vehicle?: Vehicle;
  rider?: Profile;
};

export default function OperatorRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [drivers, setDrivers] = useState<EnrichedDriver[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [staleWarning, setStaleWarning] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // 1. Fetch pending requests and drivers
  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/requests");
      if (res.status === 401 || res.status === 403) {
        router.push("/auth/login");
        return;
      }
      const data = await res.json();
      if (res.ok) {
        setRequests(data.requests || []);
        setDrivers(data.drivers || []);
      }
    } catch (err) {
      console.error("Error loading admin data:", err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 2. Realtime subscription for pending requests
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("admin_operator_services")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "services",
        },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  const selectedRequest = requests.find((r) => r.id === selectedRequestId);
  const availableDrivers = drivers.filter(
    (d) => d.availability === "online" && !d.is_busy
  );

  // Assign driver handler
  const handleAssignDriver = async (proceedWithStale = false) => {
    if (!selectedRequestId || !selectedDriverId) return;

    setAssigning(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await fetch(`/api/services/${selectedRequestId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driver_id: selectedDriverId,
          proceed_with_stale_gps: proceedWithStale,
        }),
      });

      const data = await res.json();

      if (data.warning === "STALE_GPS" && !proceedWithStale) {
        setStaleWarning(data.message);
        setAssigning(false);
        return;
      }

      if (!res.ok) {
        setActionError(data.message || "Error al asignar conductor.");
        setAssigning(false);
        return;
      }

      setActionSuccess("¡Conductor asignado y tarifa recalculada con éxito!");
      setStaleWarning(null);
      setSelectedRequestId(null);
      setSelectedDriverId("");
      await loadData();
    } catch {
      setActionError("Error de conexión al asignar conductor.");
    } finally {
      setAssigning(false);
    }
  };

  // Operator cancellation (OQ-004 / PD-023: no strike applied)
  const handleOperatorCancel = async (serviceId: string) => {
    if (!confirm("¿Estás seguro de cancelar esta solicitud como operador?")) {
      return;
    }

    try {
      const res = await fetch(`/api/services/${serviceId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: "Cancelado por el operador desde el panel de control",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Error al cancelar.");
        return;
      }

      if (selectedRequestId === serviceId) {
        setSelectedRequestId(null);
      }
      await loadData();
    } catch {
      alert("Error de conexión al cancelar.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-500 font-medium">Cargando panel de solicitudes...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">
            Cola de Solicitudes Pendientes
          </h1>
          <p className="text-xs text-gray-500">
            Asignación manual de conductores por cercanía (MVP)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-800">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>{availableDrivers.length} Conductores Online</span>
          </div>

          <button
            type="button"
            onClick={() => loadData()}
            className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition shadow-2xs"
          >
            🔄 Actualizar
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center justify-between">
          <span>{actionSuccess}</span>
          <button
            type="button"
            onClick={() => setActionSuccess(null)}
            className="text-emerald-600 hover:text-emerald-900"
          >
            ✕
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 text-xs font-bold rounded-2xl flex items-center justify-between">
          <span>{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-red-600 hover:text-red-900"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Grid: Request List (Left) + Detail/Assignment Panel (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Request List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-3xl p-6 shadow-xs border border-gray-100 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">
                Solicitudes por Asignar ({requests.length})
              </h2>
            </div>

            {requests.length === 0 ? (
              <div className="text-center py-16 text-gray-400 space-y-2">
                <span className="text-4xl block">✨</span>
                <p className="text-sm font-semibold">No hay solicitudes pendientes</p>
                <p className="text-xs">Las nuevas solicitudes aparecerán en tiempo real.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {requests.map((req) => {
                  const isSelected = req.id === selectedRequestId;
                  const timeFormatted = new Date(req.requested_at).toLocaleTimeString("es-AR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <div
                      key={req.id}
                      onClick={() => {
                        setSelectedRequestId(req.id);
                        setStaleWarning(null);
                        setActionError(null);
                      }}
                      className={`p-4 rounded-2xl transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        isSelected
                          ? "bg-blue-50/80 border-2 border-blue-500 shadow-xs"
                          : "hover:bg-gray-50 border border-transparent"
                      }`}
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-extrabold rounded-md uppercase">
                            {timeFormatted}
                          </span>
                          <span className="font-extrabold text-gray-900 text-sm truncate">
                            {req.rider?.full_name || "Pasajero"}
                          </span>
                          {req.rider?.phone && (
                            <span className="text-xs text-gray-400">
                              📞 {req.rider.phone}
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-gray-600 space-y-0.5">
                          <p className="truncate">
                            <span className="text-gray-400">📍 Origen:</span>{" "}
                            {req.pickup_address}
                          </p>
                          <p className="truncate">
                            <span className="text-gray-400">🏁 Destino:</span>{" "}
                            {req.destination_address}
                          </p>
                        </div>

                        {req.vehicle && (
                          <div className="text-[11px] text-gray-500">
                            🚗 {req.vehicle.make_model} ({req.vehicle.license_plate}) • {req.vehicle.color}
                          </div>
                        )}
                      </div>

                      <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-2 shrink-0">
                        <span className="text-blue-600 font-black text-sm">
                          {formatPrice(req.estimated_price ?? 0)}
                        </span>
                        <span className="text-[10px] font-bold px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg uppercase">
                          Pendiente
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Assignment Form & Details */}
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-6 shadow-xs border border-gray-100 space-y-5 sticky top-24">
            <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3">
              Detalle & Asignación
            </h3>

            {selectedRequest ? (
              <div className="space-y-5">
                {/* Request Overview */}
                <div className="p-4 bg-gray-50 rounded-2xl space-y-2 text-xs">
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">
                      Pasajero
                    </span>
                    <span className="font-bold text-gray-900">
                      {selectedRequest.rider?.full_name}
                    </span>
                    {selectedRequest.rider?.phone && (
                      <span className="text-gray-600 block text-[11px]">
                        {selectedRequest.rider.phone}
                      </span>
                    )}
                  </div>

                  <div className="pt-2 border-t border-gray-200/60">
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">
                      Vehículo del pasajero
                    </span>
                    <span className="font-semibold text-gray-800">
                      {selectedRequest.vehicle?.make_model} ({selectedRequest.vehicle?.license_plate})
                    </span>
                  </div>

                  <div className="pt-2 border-t border-gray-200/60 flex justify-between font-bold">
                    <span>Estimado inicial:</span>
                    <span className="text-blue-600">
                      {formatPrice(selectedRequest.estimated_price ?? 0)}
                    </span>
                  </div>
                </div>

                {/* Driver Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-700 block">
                    Seleccionar Conductor Disponible:
                  </label>
                  <select
                    value={selectedDriverId}
                    onChange={(e) => {
                      setSelectedDriverId(e.target.value);
                      setStaleWarning(null);
                    }}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Elegir conductor online --</option>
                    {availableDrivers.map((driver) => (
                      <option key={driver.id} value={driver.id}>
                        {driver.profile?.full_name || "Conductor"} (Cat: {driver.license_category})
                        {driver.profile?.average_rating
                          ? ` ★ ${Number(driver.profile.average_rating).toFixed(1)}`
                          : ""}
                      </option>
                    ))}
                  </select>

                  {availableDrivers.length === 0 && (
                    <p className="text-[11px] text-red-600 font-medium">
                      ⚠️ No hay conductores conectados y disponibles.
                    </p>
                  )}
                </div>

                {/* Stale GPS warning dialog (PD-021) */}
                {staleWarning && (
                  <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl space-y-3">
                    <div className="text-xs text-amber-900 font-semibold">
                      ⚠️ <strong>Ubicación GPS desactualizada:</strong>
                      <p className="mt-1">{staleWarning}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleAssignDriver(true)}
                        className="w-full py-2 bg-amber-600 text-white font-bold rounded-xl text-xs hover:bg-amber-700 transition"
                      >
                        Continuar de todas formas
                      </button>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    disabled={!selectedDriverId || assigning}
                    onClick={() => handleAssignDriver(false)}
                    className="w-full py-3 bg-blue-600 text-white font-bold rounded-2xl text-xs hover:bg-blue-700 transition shadow-sm disabled:opacity-50"
                  >
                    {assigning ? "Calculando y asignando..." : "Asignar Conductor & Confirmar"}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOperatorCancel(selectedRequest.id)}
                    className="w-full py-2.5 bg-gray-50 text-red-600 border border-red-100 font-bold rounded-xl text-xs hover:bg-red-50 transition"
                  >
                    Cancelar solicitud
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 text-gray-400 text-xs">
                Seleccioná una solicitud de la lista para ver los detalles y asignar un conductor.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

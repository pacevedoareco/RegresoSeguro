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
  driver?: Profile;
};

type OngoingTrip = Service & {
  vehicle?: Vehicle;
  rider?: Profile;
  driver?: Profile;
};

type CompletedTrip = Service & {
  vehicle?: Vehicle;
  rider?: Profile;
  driver?: Profile;
  ratings?: Array<{ from_user_id: string; stars: number; comment: string | null }>;
};

type CancelledTrip = Service & {
  vehicle?: Vehicle;
  rider?: Profile;
  driver?: Profile;
  ratings?: Array<{ from_user_id: string; stars: number; comment: string | null }>;
};

type Tab = "pending" | "ongoing" | "completed" | "cancelled";

export default function OperatorRequestsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("pending");
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [ongoingTrips, setOngoingTrips] = useState<OngoingTrip[]>([]);
  const [completedTrips, setCompletedTrips] = useState<CompletedTrip[]>([]);
  const [cancelledTrips, setCancelledTrips] = useState<CancelledTrip[]>([]);
  const [drivers, setDrivers] = useState<EnrichedDriver[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [selectedOngoingId, setSelectedOngoingId] = useState<string | null>(null);
  const [selectedCompletedId, setSelectedCompletedId] = useState<string | null>(null);
  const [selectedCancelledId, setSelectedCancelledId] = useState<string | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [staleWarning, setStaleWarning] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // 1. Fetch pending requests, ongoing trips, completed trips, and drivers
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
        setOngoingTrips(data.ongoingTrips || []);
        setCompletedTrips(data.completedTrips || []);
        setCancelledTrips(data.cancelledTrips || []);
        setDrivers(data.drivers || []);
      }
    } catch (err) {
      console.error("Error loading admin data:", err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    void loadData();
  }, [loadData]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // 2. Realtime subscription for services
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
          void loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  const selectedRequest = requests.find((r) => r.id === selectedRequestId);
  const selectedOngoing = ongoingTrips.find((r) => r.id === selectedOngoingId);
  const selectedCompleted = completedTrips.find((r) => r.id === selectedCompletedId);
  const selectedCancelled = cancelledTrips.find((r) => r.id === selectedCancelledId);
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

  // Operator cancellation for pending requests (OQ-004 / PD-023: no strike applied)
  const handleOperatorCancelPending = async (serviceId: string) => {
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

  // Operator cancellation for ongoing trips (no strike to rider)
  const handleOperatorCancelOngoing = async (serviceId: string, currentStatus: string) => {
    if (!confirm(`¿Estás seguro de cancelar este viaje en curso (${currentStatus}) como operador? El pasajero no recibirá strike.`)) {
      return;
    }

    setCancelling(serviceId);

    try {
      const res = await fetch(`/api/services/${serviceId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: "Cancelado por el operador desde el panel de control (viaje en curso)",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Error al cancelar.");
        return;
      }

      await loadData();
    } catch {
      alert("Error de conexión al cancelar.");
    } finally {
      setCancelling(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "requested":
        return (
          <span className="px-2.5 py-1 text-[10px] font-bold bg-amber-100 text-amber-800 rounded-lg uppercase">
            Pendiente
          </span>
        );
      case "assigned":
        return (
          <span className="px-2.5 py-1 text-[10px] font-bold bg-blue-100 text-blue-800 rounded-lg uppercase animate-pulse">
            Asignado
          </span>
        );
      case "en_route":
        return (
          <span className="px-2.5 py-1 text-[10px] font-bold bg-violet-100 text-violet-800 rounded-lg uppercase animate-pulse">
            En ruta
          </span>
        );
      case "in_progress":
        return (
          <span className="px-2.5 py-1 text-[10px] font-bold bg-orange-100 text-orange-800 rounded-lg uppercase animate-pulse">
            En curso
          </span>
        );
      case "completed":
        return (
          <span className="px-2.5 py-1 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-lg uppercase">
            Completado
          </span>
        );
      case "cancelled":
        return (
          <span className="px-2.5 py-1 text-[10px] font-bold bg-rose-100 text-rose-800 rounded-lg uppercase">
            Cancelado
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 text-[10px] font-semibold bg-gray-100 text-gray-700 rounded-lg uppercase">
            {status}
          </span>
        );
    }
  };

  // Helper to calculate trip duration in minutes
  const getTripDuration = (startedAt: string, endedAt: string | null) => {
    if (!endedAt) return null;
    const start = new Date(startedAt).getTime();
    const end = new Date(endedAt).getTime();
    const diffMs = end - start;
    const diffMins = Math.round(diffMs / (1000 * 60));
    return diffMins;
  };

  // Format duration as "X min" or "X h Y min"
  const formatDuration = (minutes: number | null) => {
    if (minutes === null || minutes < 0) return "—";
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours} h ${mins} min` : `${hours} h`;
  };

  // Render functions for each tab
  const renderPendingRequest = (req: PendingRequest) => (
    <div
      key={req.id}
      onClick={() => {
        setSelectedRequestId(req.id);
        setStaleWarning(null);
        setActionError(null);
      }}
      className={`p-4 rounded-2xl transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
        req.id === selectedRequestId
          ? "bg-blue-50/80 border-2 border-blue-500 shadow-xs"
          : "hover:bg-gray-50 border border-transparent"
      }`}
    >
      <div className="space-y-1.5 flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-extrabold rounded-md uppercase">
            {new Date(req.requested_at).toLocaleTimeString("es-AR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
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
        {getStatusBadge(req.status)}
      </div>
    </div>
  );

  const renderOngoingTrip = (trip: OngoingTrip) => (
    <div
      key={trip.id}
      onClick={() => {
        setSelectedOngoingId(trip.id);
        setActionError(null);
      }}
      className="p-4 rounded-2xl border border-gray-100 hover:bg-gray-50 transition cursor-pointer"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-violet-100 text-violet-800 text-[10px] font-extrabold rounded-md uppercase">
              {new Date(trip.requested_at).toLocaleTimeString("es-AR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <span className="font-extrabold text-gray-900 text-sm truncate">
              {trip.rider?.full_name || "Pasajero"}
            </span>
            {trip.rider?.phone && (
              <span className="text-xs text-gray-400">
                📞 {trip.rider.phone}
              </span>
            )}
          </div>

          <div className="text-xs text-gray-600 space-y-0.5">
            <p className="truncate">
              <span className="text-gray-400">📍 Origen:</span>{" "}
              {trip.pickup_address}
            </p>
            <p className="truncate">
              <span className="text-gray-400">🏁 Destino:</span>{" "}
              {trip.destination_address}
            </p>
          </div>

          {trip.vehicle && (
            <div className="text-[11px] text-gray-500">
              🚗 {trip.vehicle.make_model} ({trip.vehicle.license_plate}) • {trip.vehicle.color}
            </div>
          )}
          {trip.driver && (
            <div className="text-[11px] text-gray-500">
              👨‍✈️ Conductor: {trip.driver.full_name}
            </div>
          )}
        </div>

        <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-2 shrink-0">
          <span className="text-violet-600 font-black text-sm">
            {formatPrice(trip.final_price ?? trip.estimated_price ?? 0)}
          </span>
          {getStatusBadge(trip.status)}
          <button
            type="button"
            disabled={cancelling === trip.id}
            onClick={() => handleOperatorCancelOngoing(trip.id, trip.status)}
            className="w-full py-2 bg-red-50 text-red-600 border border-red-100 font-bold rounded-xl text-xs hover:bg-red-100 transition disabled:opacity-50"
          >
            {cancelling === trip.id ? "Cancelando..." : "Cancelar viaje"}
          </button>
        </div>
      </div>
    </div>
  );

  const renderCompletedTrip = (trip: CompletedTrip) => {
    const riderRating = trip.ratings?.find(
      (r) => r.from_user_id === trip.rider_id
    );
    const driverRating = trip.ratings?.find(
      (r) => r.from_user_id === trip.driver_id
    );
    const duration = getTripDuration(trip.requested_at, trip.completed_at);

    return (
      <div
        key={trip.id}
        onClick={() => {
          setSelectedCompletedId(trip.id);
          setActionError(null);
        }}
        className="p-4 rounded-2xl border border-gray-100 hover:bg-gray-50 transition cursor-pointer"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-md uppercase">
                {trip.completed_at
                  ? new Date(trip.completed_at).toLocaleTimeString("es-AR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : new Date(trip.requested_at).toLocaleTimeString("es-AR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
              </span>
              <span className="font-extrabold text-gray-900 text-sm truncate">
                {trip.rider?.full_name || "Pasajero"}
              </span>
            </div>

            <div className="text-xs text-gray-600 space-y-0.5">
              <p className="truncate">
                <span className="text-gray-400">📍 Origen:</span>{" "}
                {trip.pickup_address}
              </p>
              <p className="truncate">
                <span className="text-gray-400">🏁 Destino:</span>{" "}
                {trip.destination_address}
              </p>
            </div>

            {trip.vehicle && (
              <div className="text-[11px] text-gray-500">
                🚗 {trip.vehicle.make_model} ({trip.vehicle.license_plate}) • {trip.vehicle.color}
              </div>
            )}
            {trip.driver && (
              <div className="text-[11px] text-gray-500">
                👨‍✈️ Conductor: {trip.driver.full_name}
              </div>
            )}
            {duration !== null && (
              <div className="text-[11px] text-gray-500">
                ⏱️ Duración: {formatDuration(duration)}
              </div>
            )}
          </div>

          <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-2 shrink-0">
            <span className="text-emerald-600 font-black text-sm">
              {formatPrice(trip.final_price ?? 0)}
            </span>
            {getStatusBadge(trip.status)}
            <div className="flex items-center gap-1 text-[10px]">
              {riderRating && (
                <span className="text-amber-500" title="Calificación del pasajero">
                  ★ {riderRating.stars}
                </span>
              )}
              {driverRating && (
                <span className="text-amber-500" title="Calificación del conductor">
                  ★ {driverRating.stars}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCancelledTrip = (trip: CancelledTrip) => {
    const riderRating = trip.ratings?.find(
      (r) => r.from_user_id === trip.rider_id
    );
    const driverRating = trip.ratings?.find(
      (r) => r.from_user_id === trip.driver_id
    );
    const duration = getTripDuration(trip.requested_at, trip.cancelled_at);

    return (
      <div
        key={trip.id}
        onClick={() => {
          setSelectedCancelledId(trip.id);
          setActionError(null);
        }}
        className="p-4 rounded-2xl border border-gray-100 hover:bg-gray-50 transition cursor-pointer"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-extrabold rounded-md uppercase">
                {trip.cancelled_at
                  ? new Date(trip.cancelled_at).toLocaleTimeString("es-AR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : new Date(trip.requested_at).toLocaleTimeString("es-AR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
              </span>
              <span className="font-extrabold text-gray-900 text-sm truncate">
                {trip.rider?.full_name || "Pasajero"}
              </span>
            </div>

            <div className="text-xs text-gray-600 space-y-0.5">
              <p className="truncate">
                <span className="text-gray-400">📍 Origen:</span>{" "}
                {trip.pickup_address}
              </p>
              <p className="truncate">
                <span className="text-gray-400">🏁 Destino:</span>{" "}
                {trip.destination_address}
              </p>
            </div>

            {trip.vehicle && (
              <div className="text-[11px] text-gray-500">
                🚗 {trip.vehicle.make_model} ({trip.vehicle.license_plate}) • {trip.vehicle.color}
              </div>
            )}
            {trip.driver && (
              <div className="text-[11px] text-gray-500">
                👨‍✈️ Conductor: {trip.driver.full_name}
              </div>
            )}
            {duration !== null && (
              <div className="text-[11px] text-gray-500">
                ⏱️ Duración: {formatDuration(duration)}
              </div>
            )}
          </div>

          <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-2 shrink-0">
            <span className="text-rose-600 font-black text-sm">
              {formatPrice(trip.final_price ?? trip.estimated_price ?? 0)}
            </span>
            {getStatusBadge(trip.status)}
            <div className="flex items-center gap-1 text-[10px]">
              {riderRating && (
                <span className="text-amber-500" title="Calificación del pasajero">
                  ★ {riderRating.stars}
                </span>
              )}
              {driverRating && (
                <span className="text-amber-500" title="Calificación del conductor">
                  ★ {driverRating.stars}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderEmptyState = () => {
    switch (activeTab) {
      case "pending":
        return "No hay viajes pendientes";
      case "ongoing":
        return "No hay viajes en curso";
      case "completed":
        return "No hay viajes finalizados";
      case "cancelled":
        return "No hay viajes cancelados";
    }
  };

  const renderEmptySubtext = () => {
    switch (activeTab) {
      case "pending":
        return "Las nuevas solicitudes aparecerán en tiempo real.";
      case "ongoing":
        return "Los viajes asignados y en curso aparecerán aquí.";
      case "completed":
        return "Los viajes completados se mostrarán aquí.";
      case "cancelled":
        return "Los viajes cancelados se mostrarán aquí.";
    }
  };

  const renderList = () => {
    switch (activeTab) {
      case "pending":
        if (requests.length === 0) {
          return (
            <div className="text-center py-16 text-gray-400 space-y-2">
              <span className="text-4xl block">✨</span>
              <p className="text-sm font-semibold">{renderEmptyState()}</p>
              <p className="text-xs">{renderEmptySubtext()}</p>
            </div>
          );
        }
        return (
          <div className="divide-y divide-gray-100">
            {requests.map(renderPendingRequest)}
          </div>
        );
      case "ongoing":
        if (ongoingTrips.length === 0) {
          return (
            <div className="text-center py-16 text-gray-400 space-y-2">
              <span className="text-4xl block">✨</span>
              <p className="text-sm font-semibold">{renderEmptyState()}</p>
              <p className="text-xs">{renderEmptySubtext()}</p>
            </div>
          );
        }
        return (
          <div className="divide-y divide-gray-100">
            {ongoingTrips.map(renderOngoingTrip)}
          </div>
        );
      case "completed":
        if (completedTrips.length === 0) {
          return (
            <div className="text-center py-16 text-gray-400 space-y-2">
              <span className="text-4xl block">✨</span>
              <p className="text-sm font-semibold">{renderEmptyState()}</p>
              <p className="text-xs">{renderEmptySubtext()}</p>
            </div>
          );
        }
        return (
          <div className="divide-y divide-gray-100">
            {completedTrips.map(renderCompletedTrip)}
          </div>
        );
      case "cancelled":
        if (cancelledTrips.length === 0) {
          return (
            <div className="text-center py-16 text-gray-400 space-y-2">
              <span className="text-4xl block">✨</span>
              <p className="text-sm font-semibold">{renderEmptyState()}</p>
              <p className="text-xs">{renderEmptySubtext()}</p>
            </div>
          );
        }
        return (
          <div className="divide-y divide-gray-100">
            {cancelledTrips.map(renderCancelledTrip)}
          </div>
        );
    }
  };

  const renderTabTitle = () => {
    switch (activeTab) {
      case "pending":
        return `Viajes Pendientes (${requests.length})`;
      case "ongoing":
        return `Viajes en Curso (${ongoingTrips.length})`;
      case "completed":
        return `Viajes Finalizados (${completedTrips.length})`;
      case "cancelled":
        return `Viajes Cancelados (${cancelledTrips.length})`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-500 font-medium">Cargando panel de control...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">
            Panel de Operador
          </h1>
          <p className="text-xs text-gray-500">
            Gestión de solicitudes, viajes en curso e historial
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

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl border border-gray-100">
        <button
          type="button"
          onClick={() => setActiveTab("pending")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === "pending"
              ? "bg-white shadow-xs text-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Viajes Pendientes ({requests.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("ongoing")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === "ongoing"
              ? "bg-white shadow-xs text-violet-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Viajes en Curso ({ongoingTrips.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("completed")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === "completed"
              ? "bg-white shadow-xs text-emerald-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Viajes Finalizados ({completedTrips.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("cancelled")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === "cancelled"
              ? "bg-white shadow-xs text-rose-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Viajes Cancelados ({cancelledTrips.length})
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Lists */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-3xl p-6 shadow-xs border border-gray-100 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">
                {renderTabTitle()}
              </h2>
            </div>

            {renderList()}
          </div>
        </div>

        {/* Right Column: Assignment Form & Details */}
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-6 shadow-xs border border-gray-100 space-y-5 sticky top-24">
            <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3">
              {activeTab === "pending" && "Detalle & Asignación"}
              {activeTab === "ongoing" && "Detalle del Viaje"}
              {activeTab === "completed" && "Detalle del Viaje (Solo Lectura)"}
            </h3>

            {activeTab === "pending" && selectedRequest ? (
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
                    onClick={() => handleOperatorCancelPending(selectedRequest.id)}
                    className="w-full py-2.5 bg-gray-50 text-red-600 border border-red-100 font-bold rounded-xl text-xs hover:bg-red-50 transition"
                  >
                    Cancelar solicitud
                  </button>
                </div>
              </div>
            ) : activeTab === "ongoing" && selectedOngoing ? (
              <div className="space-y-5">
                {/* Trip Overview */}
                <div className="p-4 bg-gray-50 rounded-2xl space-y-2 text-xs">
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">
                      Pasajero
                    </span>
                    <span className="font-bold text-gray-900">
                      {selectedOngoing.rider?.full_name}
                    </span>
                    {selectedOngoing.rider?.phone && (
                      <span className="text-gray-600 block text-[11px]">
                        {selectedOngoing.rider.phone}
                      </span>
                    )}
                  </div>

                  <div className="pt-2 border-t border-gray-200/60">
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">
                      Vehículo del pasajero
                    </span>
                    <span className="font-semibold text-gray-800">
                      {selectedOngoing.vehicle?.make_model} ({selectedOngoing.vehicle?.license_plate})
                    </span>
                  </div>

                  {selectedOngoing.driver && (
                    <div className="pt-2 border-t border-gray-200/60">
                      <span className="text-gray-400 block text-[10px] uppercase font-bold">
                        Conductor asignado
                      </span>
                      <span className="font-semibold text-gray-800">
                        {selectedOngoing.driver.full_name}
                      </span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-gray-200/60 flex justify-between font-bold">
                    <span>Precio final:</span>
                    <span className="text-violet-600">
                      {formatPrice(selectedOngoing.final_price ?? selectedOngoing.estimated_price ?? 0)}
                    </span>
                  </div>
                </div>

                {/* Cancel Button */}
                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    disabled={cancelling === selectedOngoing.id}
                    onClick={() => handleOperatorCancelOngoing(selectedOngoing.id, selectedOngoing.status)}
                    className="w-full py-3 bg-red-600 text-white font-bold rounded-2xl text-xs hover:bg-red-700 transition shadow-sm disabled:opacity-50"
                  >
                    {cancelling === selectedOngoing.id ? "Cancelando..." : "Cancelar Viaje en Curso"}
                  </button>
                  <p className="text-[10px] text-gray-500 text-center">
                    El pasajero no recibirá strike por esta cancelación de operador.
                  </p>
                </div>
              </div>
            ) : activeTab === "completed" && selectedCompleted ? (
              <div className="space-y-5">
                {/* Trip Overview - Read Only */}
                <div className="p-4 bg-gray-50 rounded-2xl space-y-2 text-xs">
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">
                      Pasajero
                    </span>
                    <span className="font-bold text-gray-900">
                      {selectedCompleted.rider?.full_name}
                    </span>
                    {selectedCompleted.rider?.phone && (
                      <span className="text-gray-600 block text-[11px]">
                        {selectedCompleted.rider.phone}
                      </span>
                    )}
                  </div>

                  <div className="pt-2 border-t border-gray-200/60">
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">
                      Vehículo del pasajero
                    </span>
                    <span className="font-semibold text-gray-800">
                      {selectedCompleted.vehicle?.make_model} ({selectedCompleted.vehicle?.license_plate})
                    </span>
                  </div>

                  {selectedCompleted.driver && (
                    <div className="pt-2 border-t border-gray-200/60">
                      <span className="text-gray-400 block text-[10px] uppercase font-bold">
                        Conductor
                      </span>
                      <span className="font-semibold text-gray-800">
                        {selectedCompleted.driver.full_name}
                      </span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-gray-200/60 flex justify-between font-bold">
                    <span>Precio final:</span>
                    <span className="text-emerald-600">
                      {formatPrice(selectedCompleted.final_price ?? 0)}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-gray-200/60 flex justify-between font-bold text-xs">
                    <span>Solicitado:</span>
                    <span>{new Date(selectedCompleted.requested_at).toLocaleString("es-AR")}</span>
                  </div>

                  {selectedCompleted.completed_at && (
                    <div className="pt-2 border-t border-gray-200/60 flex justify-between font-bold text-xs">
                      <span>Completado:</span>
                      <span>{new Date(selectedCompleted.completed_at).toLocaleString("es-AR")}</span>
                    </div>
                  )}

                  {selectedCompleted.completed_at && (
                    <div className="pt-2 border-t border-gray-200/60 flex justify-between font-bold text-xs">
                      <span>Duración:</span>
                      <span>{formatDuration(getTripDuration(selectedCompleted.requested_at, selectedCompleted.completed_at))}</span>
                    </div>
                  )}

                  {/* Ratings */}
                  {selectedCompleted.ratings && selectedCompleted.ratings.length > 0 && (
                    <div className="pt-2 border-t border-gray-200/60">
                      <span className="text-gray-400 block text-[10px] uppercase font-bold">
                        Calificaciones
                      </span>
                      <div className="flex gap-4 mt-1 text-[11px]">
                        {selectedCompleted.ratings.map((r) => (
                          <span key={r.from_user_id} className="text-amber-500">
                            {r.from_user_id === selectedCompleted.rider_id ? "Pasajero" : "Conductor"}:{" "}
                            {"★".repeat(r.stars)} {r.comment && `(${r.comment})`}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-800">
                  ✅ Este viaje ha finalizado. Solo se pueden ver los detalles (solo lectura).
                </div>
              </div>
            ) : activeTab === "cancelled" && selectedCancelled ? (
              <div className="space-y-5">
                {/* Trip Overview - Read Only */}
                <div className="p-4 bg-gray-50 rounded-2xl space-y-2 text-xs">
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">
                      Pasajero
                    </span>
                    <span className="font-bold text-gray-900">
                      {selectedCancelled.rider?.full_name}
                    </span>
                    {selectedCancelled.rider?.phone && (
                      <span className="text-gray-600 block text-[11px]">
                        {selectedCancelled.rider.phone}
                      </span>
                    )}
                  </div>

                  <div className="pt-2 border-t border-gray-200/60">
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">
                      Vehículo del pasajero
                    </span>
                    <span className="font-semibold text-gray-800">
                      {selectedCancelled.vehicle?.make_model} ({selectedCancelled.vehicle?.license_plate})
                    </span>
                  </div>

                  {selectedCancelled.driver && (
                    <div className="pt-2 border-t border-gray-200/60">
                      <span className="text-gray-400 block text-[10px] uppercase font-bold">
                        Conductor
                      </span>
                      <span className="font-semibold text-gray-800">
                        {selectedCancelled.driver.full_name}
                      </span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-gray-200/60 flex justify-between font-bold">
                    <span>Precio final:</span>
                    <span className="text-rose-600">
                      {formatPrice(selectedCancelled.final_price ?? selectedCancelled.estimated_price ?? 0)}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-gray-200/60 flex justify-between font-bold text-xs">
                    <span>Solicitado:</span>
                    <span>{new Date(selectedCancelled.requested_at).toLocaleString("es-AR")}</span>
                  </div>

                  {selectedCancelled.cancelled_at && (
                    <div className="pt-2 border-t border-gray-200/60 flex justify-between font-bold text-xs">
                      <span>Cancelado:</span>
                      <span>{new Date(selectedCancelled.cancelled_at).toLocaleString("es-AR")}</span>
                    </div>
                  )}

                  {selectedCancelled.cancelled_at && (
                    <div className="pt-2 border-t border-gray-200/60 flex justify-between font-bold text-xs">
                      <span>Duración:</span>
                      <span>{formatDuration(getTripDuration(selectedCancelled.requested_at, selectedCancelled.cancelled_at))}</span>
                    </div>
                  )}

                  {selectedCancelled.cancellation_reason && (
                    <div className="pt-2 border-t border-gray-200/60">
                      <span className="text-gray-400 block text-[10px] uppercase font-bold">
                        Motivo de cancelación
                      </span>
                      <span className="text-rose-600 text-[11px]">{selectedCancelled.cancellation_reason}</span>
                    </div>
                  )}

                  {/* Ratings */}
                  {selectedCancelled.ratings && selectedCancelled.ratings.length > 0 && (
                    <div className="pt-2 border-t border-gray-200/60">
                      <span className="text-gray-400 block text-[10px] uppercase font-bold">
                        Calificaciones
                      </span>
                      <div className="flex gap-4 mt-1 text-[11px]">
                        {selectedCancelled.ratings.map((r) => (
                          <span key={r.from_user_id} className="text-amber-500">
                            {r.from_user_id === selectedCancelled.rider_id ? "Pasajero" : "Conductor"}:{" "}
                            {"★".repeat(r.stars)} {r.comment && `(${r.comment})`}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-800">
                  ❌ Este viaje fue cancelado. Solo se pueden ver los detalles (solo lectura).
                </div>
              </div>
            ) : (
              <div className="text-center py-10 text-gray-400 text-xs">
                {activeTab === "pending"
                  ? "Seleccioná una solicitud de la lista para ver los detalles y asignar un conductor."
                  : activeTab === "ongoing"
                  ? "Seleccioná un viaje en curso para ver los detalles."
                  : activeTab === "completed"
                  ? "Seleccioná un viaje finalizado para ver los detalles (solo lectura)."
                  : "Seleccioná un viaje cancelado para ver los detalles (solo lectura)."}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
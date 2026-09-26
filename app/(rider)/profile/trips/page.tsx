"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface ServiceItem {
  id: string;
  status: string;
  requested_at: string;
  completed_at: string | null;
  cancelled_at: string | null;
  pickup_address: string;
  destination_address: string;
  final_price: number | null;
  estimated_price: number | null;
  cancellation_reason: string | null;
  vehicle?: {
    make_model: string;
    license_plate: string;
    color: string;
  };
  driver?: {
    full_name: string;
  };
  ratings?: {
    from_user_id: string;
    stars: number;
    comment: string | null;
  }[];
}

export default function TripsHistoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeService, setActiveService] = useState<ServiceItem | null>(null);
  const [history, setHistory] = useState<ServiceItem[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const loadTrips = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login");
        return;
      }
      setUserId(user.id);

      try {
        const res = await fetch("/api/services?history=true");
        if (res.ok) {
          const data = await res.json();
          setActiveService(data.activeService || null);
          setHistory(data.history || []);
        }
      } catch (err) {
        console.error("Error loading trips:", err);
      } finally {
        setLoading(false);
      }
    };

    loadTrips();
  }, [router]);

  const formatPrice = (amount: number | null) => {
    if (amount === null || amount === undefined) return "—";
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(amount);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <span className="px-2.5 py-1 text-xs font-bold bg-emerald-100 text-emerald-800 rounded-full">
            Completado
          </span>
        );
      case "cancelled":
        return (
          <span className="px-2.5 py-1 text-xs font-bold bg-rose-100 text-rose-800 rounded-full">
            Cancelado
          </span>
        );
      case "requested":
        return (
          <span className="px-2.5 py-1 text-xs font-bold bg-amber-100 text-amber-800 rounded-full">
            Buscando conductor
          </span>
        );
      case "assigned":
      case "en_route":
      case "in_progress":
        return (
          <span className="px-2.5 py-1 text-xs font-bold bg-blue-100 text-blue-800 rounded-full animate-pulse">
            En curso
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 text-xs font-semibold bg-gray-100 text-gray-700 rounded-full">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="text-xs font-bold text-gray-500 hover:text-gray-900 flex items-center gap-1"
          >
            ← Volver
          </Link>
          <h1 className="font-extrabold text-gray-900 text-base">Mis Viajes</h1>
          <Link
            href="/profile"
            className="text-xs font-semibold text-blue-600 hover:underline"
          >
            Mi Perfil
          </Link>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 pt-6 space-y-6">
        {loading ? (
          <div className="text-center py-20 text-sm text-gray-400">
            Cargando historial de viajes...
          </div>
        ) : (
          <>
            {/* Active service card at top if present (FR-021 AC-021-2) */}
            {activeService && (
              <div className="bg-blue-600 text-white rounded-2xl p-5 shadow-lg border border-blue-500">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs uppercase font-bold tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full">
                    ⚡ Viaje Activo
                  </span>
                  <Link
                    href={`/?service_id=${activeService.id}`}
                    className="text-xs font-bold bg-white text-blue-700 px-3 py-1 rounded-lg hover:bg-blue-50 transition"
                  >
                    Ver Estado →
                  </Link>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="font-semibold text-blue-50 flex items-center gap-2">
                    <span>📍</span> {activeService.pickup_address}
                  </div>
                  <div className="font-semibold text-white flex items-center gap-2">
                    <span>🏁</span> {activeService.destination_address}
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-white/20 flex justify-between items-center text-xs text-blue-100">
                  <span>Vehículo: {activeService.vehicle?.make_model}</span>
                  <span className="font-bold text-base text-white">
                    {formatPrice(activeService.final_price || activeService.estimated_price)}
                  </span>
                </div>
              </div>
            )}

            {/* Past services list */}
            <div>
              <h2 className="text-xs uppercase font-bold tracking-wider text-gray-400 mb-3 px-1">
                Historial Pasado
              </h2>

              {history.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
                  <span className="text-3xl block mb-2">🚗</span>
                  Aún no tenés viajes registrados en tu historial.
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((trip) => {
                    const riderRating = trip.ratings?.find(
                      (r) => r.from_user_id === userId
                    );

                    return (
                      <div
                        key={trip.id}
                        className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs space-y-3"
                      >
                        <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                          <span className="text-xs text-gray-500">
                            {new Date(trip.requested_at).toLocaleDateString("es-AR", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {getStatusBadge(trip.status)}
                        </div>

                        {/* Origin and Destination */}
                        <div className="space-y-1.5 text-xs text-gray-700">
                          <div className="flex items-start gap-2">
                            <span className="text-blue-500 font-bold">●</span>
                            <span className="truncate">{trip.pickup_address}</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-emerald-500 font-bold">■</span>
                            <span className="truncate">{trip.destination_address}</span>
                          </div>
                        </div>

                        {/* Additional details */}
                        <div className="bg-gray-50 rounded-xl p-2.5 flex items-center justify-between text-xs text-gray-600">
                          <div>
                            {trip.vehicle && (
                              <div className="font-medium text-gray-800">
                                🚘 {trip.vehicle.make_model} ({trip.vehicle.license_plate})
                              </div>
                            )}
                            {trip.driver && (
                              <div className="text-[11px] text-gray-500 mt-0.5">
                                Chofer: {trip.driver.full_name}
                              </div>
                            )}
                            {(trip.status === "completed" || trip.status === "cancelled") && (
                              <div className="text-[11px] text-gray-500 mt-0.5">
                                ⏱️ Duración: {formatDuration(getTripDuration(trip.requested_at, trip.status === "completed" ? trip.completed_at : trip.cancelled_at))}
                              </div>
                            )}
                            {trip.cancellation_reason && (
                              <div className="text-[11px] text-rose-600 mt-0.5">
                                {trip.cancellation_reason}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="font-extrabold text-sm text-gray-900">
                              {formatPrice(trip.final_price || trip.estimated_price)}
                            </div>
                            {riderRating && (
                              <div className="text-amber-500 text-[11px] font-bold">
                                {"★".repeat(riderRating.stars)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

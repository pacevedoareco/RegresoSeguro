"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { DriverProfile, Service, Vehicle, Profile } from "@/types/database";
import { JobCard } from "@/components/JobCard";
import { RatingModal } from "@/components/RatingModal";

export default function DriverDashboardPage() {
  const router = useRouter();
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [activeJob, setActiveJob] = useState<(Service & { vehicle?: Vehicle; rider?: Profile }) | null>(null);
  const [completedJobForRating, setCompletedJobForRating] = useState<(Service & { rider?: Profile }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [gpsActive, setGpsActive] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);

  // 1. Initial load of driver data
  const loadData = async () => {
    try {
      const res = await fetch("/api/driver/availability");
      if (res.status === 401 || res.status === 403 || res.status === 404) {
        router.push("/auth/login");
        return;
      }
      const data = await res.json();
      if (res.ok) {
        setDriverProfile(data.driverProfile);
        setActiveJob(data.activeJob);
      }
    } catch (err) {
      console.error("Error loading driver data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 2. Realtime subscription to driver's services
  useEffect(() => {
    if (!driverProfile) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`driver_services_${driverProfile.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "services",
          filter: `driver_id=eq.${driverProfile.id}`,
        },
        () => {
          // Re-fetch data on any change
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [driverProfile?.id]);

  // 3. Periodic GPS tracking when online
  useEffect(() => {
    if (driverProfile?.availability === "online") {
      if (!navigator.geolocation) {
        setGpsError("Tu dispositivo no soporta geolocalización.");
        return;
      }

      setGpsError(null);
      setGpsActive(true);

      const sendLocation = (lat: number, lng: number) => {
        fetch("/api/driver/location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat, lng }),
        }).catch(console.error);
      };

      // Initial fix
      navigator.geolocation.getCurrentPosition(
        (pos) => sendLocation(pos.coords.latitude, pos.coords.longitude),
        (err) => setGpsError("Permiso de GPS denegado: " + err.message)
      );

      // Watch updates
      const id = navigator.geolocation.watchPosition(
        (pos) => sendLocation(pos.coords.latitude, pos.coords.longitude),
        (err) => setGpsError("GPS error: " + err.message),
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
      );

      watchIdRef.current = id;
    } else {
      // Clear GPS watch when offline
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setGpsActive(false);
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [driverProfile?.availability]);

  // Toggle availability (Online/Offline)
  const handleToggleAvailability = async () => {
    if (!driverProfile) return;
    setToggleLoading(true);
    setErrorMsg(null);

    const nextAvailability =
      driverProfile.availability === "online" ? "offline" : "online";

    try {
      const res = await fetch("/api/driver/availability", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ availability: nextAvailability }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.message || "No se pudo cambiar el estado.");
        return;
      }

      setDriverProfile((prev) =>
        prev ? { ...prev, availability: nextAvailability } : null
      );
    } catch {
      setErrorMsg("Error de conexión.");
    } finally {
      setToggleLoading(false);
    }
  };

  // Status transition handler for JobCard
  const handleStatusChange = async (
    newStatus: "en_route" | "in_progress" | "completed"
  ) => {
    if (!activeJob) return;

    const res = await fetch(`/api/services/${activeJob.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Error al actualizar estado.");
    }

    if (newStatus === "completed") {
      setCompletedJobForRating(activeJob);
      setActiveJob(null);
    } else {
      setActiveJob((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-gray-500 font-medium">Cargando panel de conductor...</div>
      </div>
    );
  }

  const isOnline = driverProfile?.availability === "online";

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Panel Conductor</h1>
            <p className="text-xs text-gray-500">Regreso Seguro • Conductor Designado</p>
          </div>
          <a
            href="/"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 underline"
          >
            Vista Pasajero
          </a>
        </div>

        {/* Status card & toggle */}
        <div className="bg-white p-5 rounded-3xl shadow-xs border border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-4 h-4 rounded-full ${
                isOnline
                  ? "bg-emerald-500 animate-pulse ring-4 ring-emerald-100"
                  : "bg-gray-400"
              }`}
            />
            <div>
              <span className="font-bold text-gray-900 text-sm block">
                {isOnline ? "Estás DISPONIBLE (Online)" : "Estás DESCONECTADO (Offline)"}
              </span>
              <span className="text-xs text-gray-500 block">
                {isOnline
                  ? "Listo para recibir asignaciones"
                  : "No recibirás nuevos viajes"}
              </span>
            </div>
          </div>

          <button
            type="button"
            disabled={toggleLoading || (activeJob !== null && isOnline)}
            onClick={handleToggleAvailability}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs ${
              isOnline
                ? "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                : "bg-emerald-600 text-white hover:bg-emerald-700"
            } disabled:opacity-50`}
          >
            {toggleLoading ? "..." : isOnline ? "Desconectar" : "Conectar"}
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl">
            {errorMsg}
          </div>
        )}

        {gpsError && (
          <div className="p-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2">
            <span>📍</span>
            <span>{gpsError}</span>
          </div>
        )}

        {isOnline && gpsActive && (
          <div className="p-2.5 bg-blue-50/50 border border-blue-100 rounded-xl text-[11px] text-blue-800 flex items-center gap-2">
            <span className="animate-ping w-2 h-2 rounded-full bg-blue-600 inline-block" />
            <span>GPS activo: transmitiendo ubicación en tiempo real.</span>
          </div>
        )}

        {/* Job view */}
        {activeJob ? (
          <JobCard service={activeJob} onStatusChange={handleStatusChange} />
        ) : (
          <div className="bg-white rounded-3xl p-8 shadow-xs border border-gray-100 text-center space-y-3">
            <div className="text-4xl">🕒</div>
            <h3 className="font-bold text-gray-900 text-base">Esperando asignación</h3>
            <p className="text-xs text-gray-500 max-w-xs mx-auto">
              {isOnline
                ? "Mantenete disponible. El operador te asignará solicitudes según cercanía."
                : "Conectate para comenzar a recibir viajes de regreso seguro."}
            </p>
          </div>
        )}

        {/* Rating Modal for Driver upon Completion (BR-024) */}
        {completedJobForRating && (
          <RatingModal
            serviceId={completedJobForRating.id}
            targetName={completedJobForRating.rider?.full_name || "Pasajero"}
            targetRoleLabel="Pasajero"
            onSubmitted={() => setCompletedJobForRating(null)}
            onDismiss={() => setCompletedJobForRating(null)}
          />
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ServiceRequestWizard } from "@/components/ServiceRequestWizard";
import { RiderStatusTracker } from "@/components/RiderStatusTracker";
import PushNotificationManager from "@/components/PushNotificationManager";
import { createClient } from "@/lib/supabase/client";
import type { Service, Vehicle, Profile } from "@/types/database";

export default function HomePage() {
  const [activeService, setActiveService] = useState<
    (Service & { vehicle?: Vehicle; driver?: Profile }) | null
  >(null);
  const [loading, setLoading] = useState(true);

  const fetchActiveService = useCallback(async () => {
    try {
      const res = await fetch("/api/services");
      if (res.ok) {
        const data = await res.json();
        setActiveService(data.activeService || null);
      } else {
        setActiveService(null);
      }
    } catch (err) {
      console.error("Error fetching active service:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    void fetchActiveService();
  }, [fetchActiveService]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Supabase Realtime subscription to live updates of the active service
  useEffect(() => {
    if (!activeService?.id) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`service_rider_${activeService.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "services",
          filter: `id=eq.${activeService.id}`,
        },
        () => {
          // Re-fetch service with expanded relations (driver, vehicle)
          fetchActiveService();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeService?.id, fetchActiveService]);

  return (
    <div className="min-h-screen bg-linear-to-b from-blue-50/50 to-gray-50 pb-12">
      {/* Top App Bar */}
      <header className="bg-white/90 backdrop-blur-md border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🚗</span>
            <span className="font-extrabold text-gray-900 tracking-tight text-lg">
              Regreso<span className="text-blue-600">Seguro</span>
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs font-semibold">
            <Link
              href="/profile/trips"
              className="text-gray-600 hover:text-blue-600 transition"
            >
              Mis Viajes
            </Link>
            <Link
              href="/profile"
              className="text-gray-600 hover:text-blue-600 transition"
            >
              Mi Perfil
            </Link>
            <Link
              href="/driver"
              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
            >
              Chofer
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 pt-6">
        <PushNotificationManager />
        {loading ? (
          <div className="text-center py-16 text-sm text-gray-400">
            Cargando estado...
          </div>
        ) : activeService ? (
          <RiderStatusTracker
            service={activeService}
            onCancelled={() => {
              setActiveService(null);
              fetchActiveService();
            }}
            onRequestAgain={() => {
              setActiveService(null);
            }}
          />
        ) : (
          <ServiceRequestWizard />
        )}
      </main>
    </div>
  );
}

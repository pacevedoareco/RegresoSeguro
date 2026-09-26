"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ServiceRequestWizard } from "@/components/ServiceRequestWizard";
import { formatPrice } from "@/lib/pricing/pricing";
import type { Service, Vehicle, Profile } from "@/types/database";

export default function HomePage() {
  const [activeService, setActiveService] = useState<
    (Service & { vehicle?: Vehicle; driver?: Profile }) | null
  >(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/services")
      .then((res) => {
        if (res.ok) return res.json();
        return { activeService: null };
      })
      .then((data) => {
        setActiveService(data.activeService || null);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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
              href="/vehicles"
              className="text-gray-600 hover:text-blue-600 transition"
            >
              Mis Autos
            </Link>
            <Link
              href="/driver"
              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
            >
              Soy Conductor
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 pt-6">
        {loading ? (
          <div className="text-center py-16 text-sm text-gray-400">
            Cargando estado...
          </div>
        ) : activeService ? (
          /* Active Service Tracker Card */
          <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                Viaje en Curso
              </h2>
              <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                {activeService.status === "requested" && "Buscando conductor"}
                {activeService.status === "assigned" && "Conductor asignado"}
                {activeService.status === "en_route" && "Conductor en camino"}
                {activeService.status === "in_progress" && "Viaje iniciado"}
              </span>
            </div>

            <div className="p-4 bg-gray-50 rounded-2xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Origen:</span>
                <span className="font-medium text-gray-800 text-right">
                  {activeService.pickup_address}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Destino:</span>
                <span className="font-medium text-gray-800 text-right">
                  {activeService.destination_address}
                </span>
              </div>
              {activeService.estimated_price && (
                <div className="flex justify-between pt-2 border-t border-gray-200 font-bold text-gray-900">
                  <span>Tarifa estimada:</span>
                  <span className="text-blue-600 font-extrabold">
                    {formatPrice(activeService.estimated_price)}
                  </span>
                </div>
              )}
            </div>

            {activeService.driver && (
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-blue-600 uppercase font-bold block">
                    Conductor Designado
                  </span>
                  <span className="font-bold text-gray-900 text-sm">
                    {activeService.driver.full_name}
                  </span>
                  {activeService.driver.phone && (
                    <span className="text-xs text-gray-600 block">
                      📞 {activeService.driver.phone}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Main Request Flow Wizard */
          <ServiceRequestWizard />
        )}
      </main>
    </div>
  );
}

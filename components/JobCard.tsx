"use client";

import { useState } from "react";
import type { Service, Vehicle, Profile } from "@/types/database";
import { formatPrice } from "@/lib/pricing/pricing";

interface JobCardProps {
  service: Service & { vehicle?: Vehicle; rider?: Profile };
  onStatusChange: (newStatus: "en_route" | "in_progress" | "completed") => Promise<void>;
}

export function JobCard({ service, onStatusChange }: JobCardProps) {
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleAction = async (nextStatus: "en_route" | "in_progress" | "completed") => {
    setLoading(true);
    setActionError(null);
    try {
      await onStatusChange(nextStatus);
    } catch (err: any) {
      setActionError(err.message || "Error al actualizar estado.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = () => {
    switch (service.status) {
      case "assigned":
        return <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Viaje Asignado</span>;
      case "en_route":
        return <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">En Camino al Origen</span>;
      case "in_progress":
        return <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Viaje en Curso</span>;
      default:
        return <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">{service.status}</span>;
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Servicio Activo</h2>
        {getStatusBadge()}
      </div>

      {/* Rider & Contact */}
      <div className="p-4 bg-gray-50 rounded-2xl flex items-center justify-between">
        <div>
          <span className="text-xs text-gray-400 block font-medium">Pasajero</span>
          <span className="font-bold text-gray-900 text-base">
            {service.rider?.full_name || "Pasajero asignado"}
          </span>
          {service.rider?.phone && (
            <span className="text-xs text-gray-500 block">📞 {service.rider.phone}</span>
          )}
        </div>
        {service.estimated_price && (
          <div className="text-right">
            <span className="text-xs text-gray-400 block font-medium">Tarifa</span>
            <span className="text-lg font-black text-blue-900">
              {formatPrice(service.estimated_price)}
            </span>
          </div>
        )}
      </div>

      {/* Route & Vehicle */}
      <div className="space-y-3 text-sm">
        <div className="flex items-start gap-2.5">
          <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
            A
          </div>
          <div>
            <span className="text-xs text-gray-400 block font-medium">Punto de encuentro (Origen)</span>
            <span className="text-gray-800 font-medium">{service.pickup_address}</span>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
            B
          </div>
          <div>
            <span className="text-xs text-gray-400 block font-medium">Destino final</span>
            <span className="text-gray-800 font-medium">{service.destination_address}</span>
          </div>
        </div>

        {service.vehicle && (
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="text-gray-500">Auto a conducir:</span>
            <span className="font-bold text-gray-800">
              {service.vehicle.make_model} ({service.vehicle.license_plate}) • {service.vehicle.color}
            </span>
          </div>
        )}
      </div>

      {actionError && (
        <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl">
          {actionError}
        </div>
      )}

      {/* Action Buttons based on status */}
      <div className="pt-2">
        {service.status === "assigned" && (
          <button
            type="button"
            disabled={loading}
            onClick={() => handleAction("en_route")}
            className="w-full py-3.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition shadow-md disabled:opacity-50"
          >
            {loading ? "Actualizando..." : "🚗 Voy en camino al origen"}
          </button>
        )}

        {service.status === "en_route" && (
          <button
            type="button"
            disabled={loading}
            onClick={() => handleAction("in_progress")}
            className="w-full py-3.5 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition shadow-md disabled:opacity-50"
          >
            {loading ? "Actualizando..." : "🔑 Llegué / Comenzar viaje en su auto"}
          </button>
        )}

        {service.status === "in_progress" && (
          <button
            type="button"
            disabled={loading}
            onClick={() => handleAction("completed")}
            className="w-full py-3.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition shadow-md disabled:opacity-50"
          >
            {loading ? "Finalizando..." : "✅ Llegamos a destino / Finalizar servicio"}
          </button>
        )}
      </div>
    </div>
  );
}

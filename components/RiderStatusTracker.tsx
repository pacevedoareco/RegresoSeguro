"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/pricing/pricing";
import type { Service, Vehicle, Profile } from "@/types/database";

interface RiderStatusTrackerProps {
  service: Service & { vehicle?: Vehicle; driver?: Profile };
  onCancelled: () => void;
  onRequestAgain?: () => void;
}

const STATUS_STEPS = [
  { key: "requested", label: "Solicitado", desc: "Buscando conductor" },
  { key: "assigned", label: "Asignado", desc: "Conductor designado" },
  { key: "en_route", label: "En camino", desc: "Conductor yendo al origen" },
  { key: "in_progress", label: "En curso", desc: "Viaje de regreso iniciado" },
  { key: "completed", label: "Completado", desc: "Llegaste a tu destino" },
];

export function RiderStatusTracker({
  service,
  onCancelled,
  onRequestAgain,
}: RiderStatusTrackerProps) {
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isCancelled = service.status === "cancelled";
  const isCompleted = service.status === "completed";
  const isRequested = service.status === "requested";
  const isAssigned = service.status === "assigned";
  const canCancel = isRequested || isAssigned;

  const currentStepIndex = STATUS_STEPS.findIndex((s) => s.key === service.status);

  const handleConfirmCancel = async () => {
    setCancelling(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/services/${service.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Cancelado por el pasajero desde la app" }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.message || "Error al cancelar el viaje.");
        setCancelling(false);
        return;
      }

      setShowCancelModal(false);
      onCancelled();
    } catch {
      setErrorMsg("Error de conexión al intentar cancelar.");
      setCancelling(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
            Estado del Viaje
          </span>
          <h2 className="text-xl font-black text-gray-900">
            {isCancelled
              ? "Servicio Cancelado"
              : isCompleted
              ? "¡Viaje Finalizado!"
              : "Regreso Seguro en Curso"}
          </h2>
        </div>

        <span
          className={`text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider ${
            isCancelled
              ? "bg-red-100 text-red-700"
              : isCompleted
              ? "bg-emerald-100 text-emerald-700"
              : "bg-blue-100 text-blue-700 animate-pulse"
          }`}
        >
          {service.status === "requested" && "Buscando"}
          {service.status === "assigned" && "Asignado"}
          {service.status === "en_route" && "En camino"}
          {service.status === "in_progress" && "En viaje"}
          {service.status === "completed" && "Completado"}
          {service.status === "cancelled" && "Cancelado"}
        </span>
      </div>

      {/* Progress Stepper for active flow */}
      {!isCancelled && (
        <div className="py-2">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-100 -z-0" />
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-blue-600 transition-all duration-500 -z-0"
              style={{
                width: `${Math.max(
                  0,
                  (currentStepIndex / (STATUS_STEPS.length - 1)) * 100
                )}%`,
              }}
            />

            {STATUS_STEPS.map((step, idx) => {
              const isPast = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              return (
                <div key={step.key} className="flex flex-col items-center z-10">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isPast
                        ? "bg-blue-600 text-white"
                        : isCurrent
                        ? "bg-blue-600 text-white ring-4 ring-blue-100"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {isPast ? "✓" : idx + 1}
                  </div>
                  <span
                    className={`text-[10px] font-medium mt-1.5 hidden sm:block ${
                      isCurrent
                        ? "text-blue-600 font-bold"
                        : isPast
                        ? "text-gray-700"
                        : "text-gray-400"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-4 p-3 bg-blue-50/60 rounded-2xl border border-blue-100 text-center">
            <p className="text-xs font-semibold text-blue-900">
              {STATUS_STEPS[currentStepIndex]?.desc || "Procesando estado..."}
            </p>
          </div>
        </div>
      )}

      {/* Cancelled Info banner */}
      {isCancelled && (
        <div className="p-4 bg-red-50 rounded-2xl border border-red-200 space-y-2">
          <div className="flex items-center gap-2 text-red-800 font-bold text-sm">
            <span>⚠️</span>
            <span>Este servicio fue cancelado</span>
          </div>
          {service.cancellation_reason && (
            <p className="text-xs text-red-700">
              Motivo: {service.cancellation_reason}
            </p>
          )}
          {onRequestAgain && (
            <button
              type="button"
              onClick={onRequestAgain}
              className="mt-2 w-full py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition"
            >
              Pedir un nuevo viaje
            </button>
          )}
        </div>
      )}

      {/* Assigned Driver Card */}
      {service.driver && !isCancelled && (
        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] text-blue-600 uppercase font-bold tracking-wider block">
                Conductor Asignado
              </span>
              <span className="font-extrabold text-gray-900 text-base block">
                {service.driver.full_name}
              </span>
            </div>

            {service.driver.phone && (
              <a
                href={`tel:${service.driver.phone}`}
                className="px-3.5 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 hover:bg-emerald-700 transition shadow-xs"
              >
                <span>📞</span>
                <span>Llamar</span>
              </a>
            )}
          </div>

          {service.driver.average_rating && (
            <div className="flex items-center gap-1 text-xs text-amber-600 font-bold">
              <span>★</span>
              <span>{Number(service.driver.average_rating).toFixed(1)}</span>
              <span className="text-gray-400 font-normal">
                ({service.driver.rating_count} viajes)
              </span>
            </div>
          )}
        </div>
      )}

      {/* Trip Details */}
      <div className="p-4 bg-gray-50 rounded-2xl space-y-2.5 text-xs">
        <div className="flex justify-between items-start gap-2">
          <span className="text-gray-500 shrink-0">📍 Origen:</span>
          <span className="font-medium text-gray-800 text-right">
            {service.pickup_address}
          </span>
        </div>
        <div className="flex justify-between items-start gap-2">
          <span className="text-gray-500 shrink-0">🏁 Destino:</span>
          <span className="font-medium text-gray-800 text-right">
            {service.destination_address}
          </span>
        </div>
        {service.vehicle && (
          <div className="flex justify-between items-center gap-2 pt-2 border-t border-gray-200/60">
            <span className="text-gray-500">🚗 Tu auto:</span>
            <span className="font-bold text-gray-800">
              {service.vehicle.make_model} ({service.vehicle.license_plate})
            </span>
          </div>
        )}
        <div className="flex justify-between items-center pt-2 border-t border-gray-200/60 font-bold text-gray-900">
          <span>{service.final_price ? "Tarifa confirmada:" : "Tarifa estimada:"}</span>
          <span className="text-blue-600 font-extrabold text-sm">
            {formatPrice(service.final_price ?? service.estimated_price ?? 0)}
          </span>
        </div>
      </div>

      {/* Cancellation CTA button */}
      {canCancel && (
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowCancelModal(true)}
            className="w-full py-3 bg-red-50 text-red-600 border border-red-200 rounded-2xl text-xs font-bold hover:bg-red-100 transition"
          >
            Cancelar solicitud
          </button>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-red-600 text-2xl mx-auto">
              ⚠️
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="font-black text-gray-900 text-lg">
                ¿Cancelar viaje?
              </h3>
              {isRequested ? (
                <p className="text-xs text-gray-600">
                  Aún no se ha asignado un conductor. La cancelación es{" "}
                  <strong className="text-emerald-700">gratuita y sin penalidad</strong>.
                </p>
              ) : (
                <p className="text-xs text-amber-800 bg-amber-50 p-3 rounded-xl border border-amber-200">
                  Ya tenés un conductor asignado. Cancelar en este momento sumará{" "}
                  <strong>1 strike</strong> a tu cuenta. (3 strikes causan la suspensión).
                </p>
              )}
            </div>

            {errorMsg && (
              <p className="text-xs text-red-600 text-center">{errorMsg}</p>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                disabled={cancelling}
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs hover:bg-gray-200 transition"
              >
                Volver
              </button>
              <button
                type="button"
                disabled={cancelling}
                onClick={handleConfirmCancel}
                className="flex-1 py-2.5 bg-red-600 text-white font-bold rounded-xl text-xs hover:bg-red-700 transition"
              >
                {cancelling ? "Cancelando..." : "Confirmar cancelación"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

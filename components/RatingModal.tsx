"use client";

import { useState } from "react";

interface RatingModalProps {
  serviceId: string;
  targetName: string;
  targetRoleLabel: string; // e.g., "Conductor" or "Pasajero"
  onSubmitted: () => void;
  onDismiss: () => void;
}

export function RatingModal({
  serviceId,
  targetName,
  targetRoleLabel,
  onSubmitted,
  onDismiss,
}: RatingModalProps) {
  const [stars, setStars] = useState<number>(5);
  const [hoverStars, setHoverStars] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_id: serviceId,
          stars,
          comment: comment.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.message || "Error al enviar la calificación.");
        setSubmitting(false);
        return;
      }

      setSubmittedSuccess(true);
      setTimeout(() => {
        onSubmitted();
      }, 1500);
    } catch {
      setErrorMsg("Error de conexión al calificar.");
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-5 animate-in fade-in duration-200">
        {submittedSuccess ? (
          <div className="text-center py-6 space-y-3">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto">
              ✓
            </div>
            <h3 className="text-lg font-black text-gray-900">
              ¡Calificación Enviada!
            </h3>
            <p className="text-xs text-gray-500">
              Gracias por ayudarnos a mantener la comunidad de Regreso Seguro con la mejor calidad.
            </p>
          </div>
        ) : (
          <>
            <div className="text-center space-y-1">
              <span className="text-[10px] uppercase font-bold text-blue-600 tracking-wider">
                Viaje Completado
              </span>
              <h3 className="text-lg font-black text-gray-900">
                Calificá a tu {targetRoleLabel}
              </h3>
              <p className="text-xs text-gray-500 font-medium">
                {targetName}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Star selector */}
              <div className="flex justify-center items-center gap-2 py-2">
                {[1, 2, 3, 4, 5].map((s) => {
                  const isFilled = (hoverStars ?? stars) >= s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onMouseEnter={() => setHoverStars(s)}
                      onMouseLeave={() => setHoverStars(null)}
                      onClick={() => setStars(s)}
                      className="text-3xl transition-transform hover:scale-125 focus:outline-none"
                    >
                      <span className={isFilled ? "text-amber-400" : "text-gray-200"}>
                        ★
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="text-center text-xs font-bold text-gray-700">
                {stars === 1 && "Muy malo"}
                {stars === 2 && "Malo"}
                {stars === 3 && "Regular"}
                {stars === 4 && "Muy bueno"}
                {stars === 5 && "Excelente"}
              </div>

              {/* Optional Comment */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Comentario (opcional):
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="¿Cómo fue la experiencia del viaje?"
                  rows={3}
                  maxLength={500}
                  className="w-full text-xs p-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 text-center">
                  {errorMsg}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={onDismiss}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs hover:bg-gray-200 transition"
                >
                  Omitir
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-700 transition shadow-sm disabled:opacity-50"
                >
                  {submitting ? "Enviando..." : "Enviar Calificación"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

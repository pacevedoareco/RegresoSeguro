"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/pricing/pricing";
import { getPaymentMethodInfo } from "@/lib/payments/payments";
import type { EarningsSummary } from "@/lib/earnings/earnings";
import type { PaymentMethod, PaymentStatus } from "@/types/database";

interface SettlementItem {
  id: string;
  completed_at: string | null;
  pickup_address: string;
  destination_address: string;
  final_price: number | null;
  final_pickup_km: number | null;
  final_ride_km: number | null;
  final_return_km: number | null;
  commission_rate_at_time: number | null;
  commission_amount: number | null;
  driver_net_amount: number | null;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
}

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Argentina/Buenos_Aires",
});

function totalKm(s: SettlementItem): number {
  return Number(s.final_pickup_km ?? 0) + Number(s.final_ride_km ?? 0) + Number(s.final_return_km ?? 0);
}

// HU-35: driver wallet — balances and settlement detail per completed service
export default function DriverEarningsPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [settlements, setSettlements] = useState<SettlementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/driver/earnings")
      .then(async (res) => {
        if (res.status === 401 || res.status === 403) {
          router.push("/auth/login");
          return;
        }
        const data = await res.json();
        if (!res.ok) {
          setErrorMsg(data.message || "No se pudieron cargar las ganancias.");
          return;
        }
        setSummary(data.summary);
        setSettlements(data.settlements);
      })
      .catch(() => setErrorMsg("Error de conexión."))
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Mis ganancias</h1>
            <p className="text-xs text-gray-500">Liquidación neta por servicio realizado</p>
          </div>
          <Link
            href="/driver"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 underline"
          >
            ← Panel
          </Link>
        </div>

        {loading ? (
          <div className="py-10 text-center text-sm text-gray-500 animate-pulse">
            Cargando billetera...
          </div>
        ) : errorMsg ? (
          <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl">
            {errorMsg}
          </div>
        ) : (
          <>
            {/* Balance */}
            <div className="bg-emerald-600 text-white p-5 rounded-3xl shadow-md space-y-4">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-100 block">
                  Balance acumulado
                </span>
                <span className="text-3xl font-black block">{formatPrice(summary?.total ?? 0)}</span>
                <span className="text-xs text-emerald-100">
                  {summary?.count ?? 0} {summary?.count === 1 ? "servicio liquidado" : "servicios liquidados"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white/15 rounded-2xl p-3">
                  <span className="text-[10px] uppercase font-bold text-emerald-100 block">Hoy</span>
                  <span className="font-extrabold">{formatPrice(summary?.today ?? 0)}</span>
                </div>
                <div className="bg-white/15 rounded-2xl p-3">
                  <span className="text-[10px] uppercase font-bold text-emerald-100 block">Esta semana</span>
                  <span className="font-extrabold">{formatPrice(summary?.week ?? 0)}</span>
                </div>
              </div>
            </div>

            {/* Settlement detail */}
            <div className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                Detalle de liquidaciones
              </h2>

              {settlements.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 shadow-xs border border-gray-100 text-center text-xs text-gray-500">
                  Todavía no completaste servicios. Tus liquidaciones van a aparecer acá.
                </div>
              ) : (
                settlements.map((s) => {
                  const payment = getPaymentMethodInfo(s.payment_method);
                  const ratePct = Math.round(Number(s.commission_rate_at_time ?? 0) * 1000) / 10;
                  return (
                    <div
                      key={s.id}
                      className="bg-white rounded-3xl p-4 shadow-xs border border-gray-100 space-y-2.5 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-gray-900">
                          {s.completed_at ? dateFormatter.format(new Date(s.completed_at)) : "—"}
                        </span>
                        <span className="text-gray-500">
                          {payment.icon} {payment.label}
                        </span>
                      </div>
                      <p className="text-gray-600 truncate">
                        {s.pickup_address} → {s.destination_address}
                      </p>
                      <div className="pt-2 border-t border-gray-100 space-y-1 text-gray-700">
                        <div className="flex justify-between">
                          <span>Distancia facturada:</span>
                          <span className="font-medium">{Math.round(totalKm(s))} km</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Tarifa liquidada:</span>
                          <span className="font-medium">{formatPrice(Number(s.final_price ?? 0))}</span>
                        </div>
                        <div className="flex justify-between text-red-600">
                          <span>Comisión operativa ({ratePct}%):</span>
                          <span className="font-medium">− {formatPrice(Number(s.commission_amount ?? 0))}</span>
                        </div>
                        <div className="flex justify-between pt-1.5 border-t border-gray-100 font-bold text-gray-900">
                          <span>Neto acreditado:</span>
                          <span className="text-emerald-700 text-sm font-extrabold">
                            {formatPrice(Number(s.driver_net_amount ?? 0))}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

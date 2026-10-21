/**
 * Payment method metadata (pure)
 * HU-12: rider chooses how to pay at request time.
 * PD-026: digital payments are simulated in the MVP (no real gateway).
 */

import type { PaymentMethod, PaymentStatus } from "@/types/database";

export interface PaymentMethodInfo {
  value: PaymentMethod;
  label: string;
  icon: string;
  description: string;
  isDigital: boolean;
  instructions: string[];
}

// Fictitious account used for the simulated transfer flow (PD-026)
export const TRANSFER_ACCOUNT = {
  alias: "regreso.seguro.mp",
  cbu: "0000003100000000000000",
  holder: "Regreso Seguro S.A.",
};

export const PAYMENT_METHODS: PaymentMethodInfo[] = [
  {
    value: "mercado_pago",
    label: "Mercado Pago",
    icon: "💳",
    description: "Pagás desde la app de Mercado Pago.",
    isDigital: true,
    instructions: [
      "Una vez asignado el chofer vas a poder confirmar el pago desde el seguimiento del viaje.",
      "El pago es simulado: no se realiza ningún cobro real.",
    ],
  },
  {
    value: "transfer",
    label: "Transferencia",
    icon: "🏦",
    description: "Transferís a la cuenta de Regreso Seguro.",
    isDigital: true,
    instructions: [
      `Alias: ${TRANSFER_ACCOUNT.alias}`,
      `CBU: ${TRANSFER_ACCOUNT.cbu}`,
      `Titular: ${TRANSFER_ACCOUNT.holder}`,
      "Usá el monto final informado al asignarse el chofer. La confirmación es simulada.",
    ],
  },
  {
    value: "cash",
    label: "Efectivo",
    icon: "💵",
    description: "Le abonás al chofer al finalizar el servicio.",
    isDigital: false,
    instructions: ["Abonás en efectivo al chofer al finalizar el servicio."],
  },
];

export const PAYMENT_METHOD_VALUES = PAYMENT_METHODS.map((m) => m.value) as [
  PaymentMethod,
  ...PaymentMethod[],
];

export function getPaymentMethodInfo(method: string | null | undefined): PaymentMethodInfo {
  return PAYMENT_METHODS.find((m) => m.value === method) ?? PAYMENT_METHODS[2];
}

export function getPaymentMethodLabel(method: string | null | undefined): string {
  return getPaymentMethodInfo(method).label;
}

export function isDigitalPayment(method: string | null | undefined): boolean {
  return getPaymentMethodInfo(method).isDigital;
}

export function getPaymentStatusLabel(status: PaymentStatus | string | null | undefined): string {
  return status === "paid" ? "Pagado" : "Pendiente";
}

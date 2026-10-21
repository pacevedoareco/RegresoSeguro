import { describe, it, expect } from "vitest";
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_VALUES,
  getPaymentMethodLabel,
  getPaymentStatusLabel,
  isDigitalPayment,
} from "@/lib/payments/payments";

describe("Payment methods (HU-12)", () => {
  it("UT-012-1: offers Mercado Pago, transferencia and efectivo", () => {
    expect(PAYMENT_METHOD_VALUES).toEqual(["mercado_pago", "transfer", "cash"]);
    expect(PAYMENT_METHODS.every((m) => m.instructions.length > 0)).toBe(true);
  });

  it("UT-012-2: maps methods to Spanish labels", () => {
    expect(getPaymentMethodLabel("mercado_pago")).toBe("Mercado Pago");
    expect(getPaymentMethodLabel("transfer")).toBe("Transferencia");
    expect(getPaymentMethodLabel("cash")).toBe("Efectivo");
  });

  it("UT-012-3: falls back to cash for unknown or missing values", () => {
    expect(getPaymentMethodLabel(undefined)).toBe("Efectivo");
    expect(getPaymentMethodLabel("bitcoin")).toBe("Efectivo");
  });

  it("UT-012-4: only Mercado Pago and transferencia are digital", () => {
    expect(isDigitalPayment("mercado_pago")).toBe(true);
    expect(isDigitalPayment("transfer")).toBe(true);
    expect(isDigitalPayment("cash")).toBe(false);
  });

  it("UT-012-5: labels payment status", () => {
    expect(getPaymentStatusLabel("paid")).toBe("Pagado");
    expect(getPaymentStatusLabel("pending")).toBe("Pendiente");
  });
});

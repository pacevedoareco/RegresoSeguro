import { describe, it, expect } from "vitest";
import { calculatePrice, formatPrice } from "@/lib/pricing/pricing";

describe("Price calculation (BR-012)", () => {
  describe("calculatePrice", () => {
    it("UT-001-1: calculates total as sum of 3 legs × price_per_km", () => {
      const result = calculatePrice(
        { pickupKm: 5, rideKm: 10, returnKm: 3 },
        100
      );
      expect(result.totalKm).toBeCloseTo(18, 3);
      expect(result.totalPrice).toBeCloseTo(1800, 2);
    });

    it("UT-001-2: calculates with fractional distances", () => {
      const result = calculatePrice(
        { pickupKm: 2.5, rideKm: 7.3, returnKm: 1.2 },
        150
      );
      // total km = 11.0
      expect(result.totalKm).toBeCloseTo(11.0, 3);
      expect(result.totalPrice).toBeCloseTo(1650, 2);
    });

    it("UT-001-3: preserves individual leg distances in breakdown", () => {
      const result = calculatePrice(
        { pickupKm: 3, rideKm: 8, returnKm: 2 },
        200
      );
      expect(result.pickupKm).toBe(3);
      expect(result.rideKm).toBe(8);
      expect(result.returnKm).toBe(2);
      expect(result.pricePerKm).toBe(200);
    });

    it("UT-001-4: rounds total price to 2 decimal places", () => {
      const result = calculatePrice(
        { pickupKm: 1, rideKm: 1, returnKm: 1 },
        333.333
      );
      // 3 km × 333.333 = 999.999 → rounds to 1000.00
      expect(result.totalPrice).toBeCloseTo(1000.0, 2);
    });

    it("UT-001-5: handles zero distances", () => {
      const result = calculatePrice(
        { pickupKm: 0, rideKm: 10, returnKm: 0 },
        100
      );
      expect(result.totalKm).toBe(10);
      expect(result.totalPrice).toBe(1000);
    });
  });

  describe("formatPrice (OQ-005)", () => {
    it("formats price using Argentine locale ($1.500,00)", () => {
      const formatted = formatPrice(1500);
      // es-AR format: $ 1.500,00 (may have non-breaking space)
      expect(formatted).toMatch(/1\.500,00/);
    });

    it("formats price with cents", () => {
      const formatted = formatPrice(1234.56);
      expect(formatted).toMatch(/1\.234,56/);
    });

    it("formats zero price", () => {
      const formatted = formatPrice(0);
      expect(formatted).toMatch(/0,00/);
    });
  });
});

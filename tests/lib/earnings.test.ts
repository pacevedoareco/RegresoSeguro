import { describe, it, expect } from "vitest";
import {
  calculateSettlement,
  summarizeEarnings,
  startOfArgentineDay,
  startOfArgentineWeek,
  DEFAULT_COMMISSION_RATE,
} from "@/lib/earnings/earnings";

describe("Driver settlement (HU-35)", () => {
  describe("calculateSettlement", () => {
    it("UT-035-1: deducts the default 20% commission", () => {
      const s = calculateSettlement(10000, DEFAULT_COMMISSION_RATE);
      expect(s.grossAmount).toBe(10000);
      expect(s.commissionAmount).toBe(2000);
      expect(s.netAmount).toBe(8000);
      expect(s.commissionRate).toBe(0.2);
    });

    it("UT-035-2: commission + net always equals gross after rounding", () => {
      const s = calculateSettlement(1234.56, 0.15);
      expect(s.commissionAmount).toBe(185.18);
      expect(s.netAmount).toBe(1049.38);
      expect(s.commissionAmount + s.netAmount).toBeCloseTo(s.grossAmount, 2);
    });

    it("UT-035-3: 0% commission gives the full fare to the driver", () => {
      const s = calculateSettlement(5000, 0);
      expect(s.commissionAmount).toBe(0);
      expect(s.netAmount).toBe(5000);
    });

    it("UT-035-4: rejects invalid prices and rates", () => {
      expect(() => calculateSettlement(-1, 0.2)).toThrow();
      expect(() => calculateSettlement(NaN, 0.2)).toThrow();
      expect(() => calculateSettlement(1000, 1)).toThrow();
      expect(() => calculateSettlement(1000, -0.1)).toThrow();
    });
  });

  describe("Argentine day/week boundaries", () => {
    // Tuesday 2026-10-20 12:00 ART
    const now = new Date("2026-10-20T15:00:00Z");

    it("UT-035-5: day starts at 00:00 ART (03:00 UTC)", () => {
      expect(new Date(startOfArgentineDay(now)).toISOString()).toBe("2026-10-20T03:00:00.000Z");
    });

    it("UT-035-6: day boundary is correct just after local midnight", () => {
      // 00:30 ART on the 21st is still 03:30 UTC on the 21st
      const early = new Date("2026-10-21T03:30:00Z");
      expect(new Date(startOfArgentineDay(early)).toISOString()).toBe("2026-10-21T03:00:00.000Z");
      // 23:30 ART on the 20th is 02:30 UTC on the 21st
      const late = new Date("2026-10-21T02:30:00Z");
      expect(new Date(startOfArgentineDay(late)).toISOString()).toBe("2026-10-20T03:00:00.000Z");
    });

    it("UT-035-7: week starts Monday 00:00 ART", () => {
      expect(new Date(startOfArgentineWeek(now)).toISOString()).toBe("2026-10-19T03:00:00.000Z");
      const sunday = new Date("2026-10-25T20:00:00Z");
      expect(new Date(startOfArgentineWeek(sunday)).toISOString()).toBe("2026-10-19T03:00:00.000Z");
    });
  });

  describe("summarizeEarnings", () => {
    const now = new Date("2026-10-20T15:00:00Z");

    it("UT-035-8: aggregates today, week and total balances", () => {
      const summary = summarizeEarnings(
        [
          { completed_at: "2026-10-20T10:00:00Z", driver_net_amount: 1000 }, // today
          { completed_at: "2026-10-19T05:00:00Z", driver_net_amount: 500.5 }, // Monday
          { completed_at: "2026-10-19T02:00:00Z", driver_net_amount: 300 }, // Sunday 23:00 ART
          { completed_at: "2026-09-01T12:00:00Z", driver_net_amount: 200 },
        ],
        now
      );
      expect(summary).toEqual({ today: 1000, week: 1500.5, total: 2000.5, count: 4 });
    });

    it("UT-035-9: ignores unsettled entries", () => {
      const summary = summarizeEarnings(
        [
          { completed_at: "2026-10-20T10:00:00Z", driver_net_amount: null },
          { completed_at: null, driver_net_amount: 100 },
        ],
        now
      );
      expect(summary).toEqual({ today: 0, week: 0, total: 0, count: 0 });
    });
  });
});

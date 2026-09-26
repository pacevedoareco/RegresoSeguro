import { describe, it, expect } from "vitest";
import {
  haversineDistanceKm,
  calculateThreeLegDistances,
} from "@/lib/services/routing";

describe("Routing & Haversine Distance", () => {
  it("calculates distance between two known points accurately", () => {
    // Obelisco: -34.6037, -58.3816
    // Plaza de Mayo: -34.6083, -58.3712
    const p1 = { lat: -34.6037, lng: -58.3816 };
    const p2 = { lat: -34.6083, lng: -58.3712 };

    const distance = haversineDistanceKm(p1, p2);
    // Direct line distance is approximately 1.08 km
    expect(distance).toBeGreaterThan(0.9);
    expect(distance).toBeLessThan(1.3);
  });

  it("calculates 3-leg distance for driver, pickup, and destination", async () => {
    const driver = { lat: -34.6000, lng: -58.3800 };
    const pickup = { lat: -34.6100, lng: -58.3900 };
    const dest = { lat: -34.6200, lng: -58.4000 };

    const result = await calculateThreeLegDistances(driver, pickup, dest);
    expect(result.pickupKm).toBeGreaterThan(0);
    expect(result.rideKm).toBeGreaterThan(0);
    expect(result.returnKm).toBeGreaterThan(0);
  });
});

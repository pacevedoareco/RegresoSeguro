import { describe, it, expect } from "vitest";
import { computeAnalyticsMetrics } from "@/lib/analytics/analytics";

describe("computeAnalyticsMetrics", () => {
  it("calculates correct counts, cancellation rate, response times, and CSAT rating", () => {
    const services = [
      {
        id: "s1",
        status: "completed",
        requested_at: "2026-09-26T10:00:00Z",
        assigned_at: "2026-09-26T10:05:00Z", // 5 min
      },
      {
        id: "s2",
        status: "completed",
        requested_at: "2026-09-26T11:00:00Z",
        assigned_at: "2026-09-26T11:07:00Z", // 7 min
      },
      {
        id: "s3",
        status: "cancelled",
        requested_at: "2026-09-26T12:00:00Z",
        assigned_at: null,
      },
      {
        id: "s4",
        status: "in_progress",
        requested_at: "2026-09-26T13:00:00Z",
        assigned_at: "2026-09-26T13:03:00Z", // 3 min
      },
    ];

    const ratings = [
      { stars: 5 },
      { stars: 4 },
      { stars: 5 },
    ];

    const result = computeAnalyticsMetrics(services, ratings);

    expect(result.totalRequests).toBe(4);
    expect(result.byStatus.completed).toBe(2);
    expect(result.byStatus.cancelled).toBe(1);
    expect(result.byStatus.in_progress).toBe(1);
    // Cancellation rate: 1 / 4 = 25%
    expect(result.cancellationRate).toBe(25);
    // Response times: (5 + 7 + 3) / 3 = 5 min
    expect(result.avgResponseTimeMinutes).toBe(5);
    // Average rating: (5 + 4 + 5) / 3 = 4.67
    expect(result.avgRating).toBe(4.67);
    expect(result.totalRatings).toBe(3);
  });

  it("handles empty data gracefully", () => {
    const result = computeAnalyticsMetrics([], []);

    expect(result.totalRequests).toBe(0);
    expect(result.cancellationRate).toBe(0);
    expect(result.avgResponseTimeMinutes).toBeNull();
    expect(result.avgRating).toBeNull();
    expect(result.totalRatings).toBe(0);
  });
});

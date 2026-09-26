export interface AnalyticsResult {
  totalRequests: number;
  byStatus: {
    requested: number;
    assigned: number;
    en_route: number;
    in_progress: number;
    completed: number;
    cancelled: number;
  };
  totalInProgress: number;
  avgResponseTimeMinutes: number | null;
  avgRating: number | null;
  totalRatings: number;
  cancellationRate: number; // percentage (0 - 100)
}

export function computeAnalyticsMetrics(
  services: Array<{
    id: string;
    status: string;
    requested_at: string;
    assigned_at: string | null;
  }>,
  ratings: Array<{
    stars: number;
  }>
): AnalyticsResult {
  const totalRequests = services.length;

  const byStatus = {
    requested: 0,
    assigned: 0,
    en_route: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
  };

  let responseTimeSumMs = 0;
  let responseTimeCount = 0;

  for (const s of services) {
    if (s.status in byStatus) {
      (byStatus as any)[s.status]++;
    }

    if (s.requested_at && s.assigned_at) {
      const reqTime = new Date(s.requested_at).getTime();
      const assTime = new Date(s.assigned_at).getTime();
      const diff = assTime - reqTime;
      if (diff >= 0) {
        responseTimeSumMs += diff;
        responseTimeCount++;
      }
    }
  }

  const totalInProgress =
    byStatus.requested + byStatus.assigned + byStatus.en_route + byStatus.in_progress;

  const avgResponseTimeMinutes =
    responseTimeCount > 0
      ? Number((responseTimeSumMs / responseTimeCount / 60000).toFixed(1))
      : null;

  const cancellationRate =
    totalRequests > 0
      ? Number(((byStatus.cancelled / totalRequests) * 100).toFixed(1))
      : 0;

  let totalRatingSum = 0;
  for (const r of ratings) {
    totalRatingSum += Number(r.stars);
  }

  const avgRating =
    ratings.length > 0
      ? Number((totalRatingSum / ratings.length).toFixed(2))
      : null;

  return {
    totalRequests,
    byStatus,
    totalInProgress,
    avgResponseTimeMinutes,
    avgRating,
    totalRatings: ratings.length,
    cancellationRate,
  };
}

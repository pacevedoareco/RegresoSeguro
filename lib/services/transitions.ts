/**
 * Service status transition validation (pure functions)
 * BR-014, BR-015: Status transitions are strictly defined.
 *
 * Allowed transitions:
 *   requested → assigned      (operator action)
 *   requested → cancelled     (rider free cancel)
 *   assigned  → en_route      (driver action)
 *   assigned  → cancelled     (rider with strike | operator without strike)
 *   en_route  → in_progress   (driver action)
 *   in_progress → completed   (driver action)
 */

import type { ServiceStatus } from "@/types/database";

const ALLOWED_TRANSITIONS: Record<ServiceStatus, ServiceStatus[]> = {
  requested: ["assigned", "cancelled"],
  assigned: ["en_route", "cancelled"],
  en_route: ["in_progress"],
  in_progress: ["completed"],
  completed: [],
  cancelled: [],
};

/**
 * Returns `true` if transitioning from `from` to `to` is allowed.
 */
export function isValidTransition(
  from: ServiceStatus,
  to: ServiceStatus
): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Returns the list of statuses that `currentStatus` can transition to.
 */
export function allowedNextStatuses(
  currentStatus: ServiceStatus
): ServiceStatus[] {
  return ALLOWED_TRANSITIONS[currentStatus] ?? [];
}

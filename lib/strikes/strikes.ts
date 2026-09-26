/**
 * Strike and suspension logic (pure functions)
 * BR-002: Account suspension at 3 strikes
 * BR-003: Strike on post-assignment cancellation
 * BR-004: Free cancellation while requested
 */

import type { ServiceStatus } from "@/types/database";

/**
 * Determines whether cancelling a service from `currentStatus` incurs a strike.
 * BR-003: Only assigned → cancelled incurs a strike.
 * BR-004: requested → cancelled is free.
 */
export function cancellationIncursStrike(currentStatus: ServiceStatus): boolean {
  return currentStatus === "assigned";
}

/**
 * Returns `true` if the given strike count warrants account suspension.
 * BR-002: strikes >= 3 → suspended.
 */
export function shouldBeSuspended(strikes: number): boolean {
  return strikes >= 3;
}

/**
 * Returns the new strike count after a cancellation.
 * The caller is responsible for persisting the result.
 */
export function newStrikeCount(
  currentStrikes: number,
  currentStatus: ServiceStatus
): number {
  if (cancellationIncursStrike(currentStatus)) {
    return currentStrikes + 1;
  }
  return currentStrikes;
}

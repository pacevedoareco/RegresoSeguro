/**
 * Driver settlement logic (pure functions)
 * HU-35: net earnings = final_price − operational commission.
 * PD-026: commission rate is configurable (pricing_config) and frozen per service at completion.
 */

export const DEFAULT_COMMISSION_RATE = 0.2;

export interface Settlement {
  grossAmount: number;
  commissionRate: number;
  commissionAmount: number;
  netAmount: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Splits a service's final price into commission and driver net amount.
 * The net is derived from the rounded commission so both always add up to the gross.
 */
export function calculateSettlement(finalPrice: number, commissionRate: number): Settlement {
  if (!Number.isFinite(finalPrice) || finalPrice < 0) {
    throw new Error("El precio final debe ser un número mayor o igual a cero.");
  }
  if (!Number.isFinite(commissionRate) || commissionRate < 0 || commissionRate >= 1) {
    throw new Error("La comisión debe estar entre 0 y 1.");
  }

  const grossAmount = round2(finalPrice);
  const commissionAmount = round2(grossAmount * commissionRate);

  return {
    grossAmount,
    commissionRate,
    commissionAmount,
    netAmount: round2(grossAmount - commissionAmount),
  };
}

export interface EarningsEntry {
  completed_at: string | null;
  driver_net_amount: number | null;
}

export interface EarningsSummary {
  today: number;
  week: number;
  total: number;
  count: number;
}

// Argentina has no DST: UTC−3 all year
const AR_OFFSET_MS = -3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Start of the Argentine calendar day containing `now`, as a UTC timestamp. */
export function startOfArgentineDay(now: Date): number {
  const local = now.getTime() + AR_OFFSET_MS;
  return local - (((local % DAY_MS) + DAY_MS) % DAY_MS) - AR_OFFSET_MS;
}

/** Start of the Argentine week (Monday 00:00) containing `now`, as a UTC timestamp. */
export function startOfArgentineWeek(now: Date): number {
  const dayStart = startOfArgentineDay(now);
  const weekday = new Date(dayStart + AR_OFFSET_MS).getUTCDay(); // 0 = Sunday
  const daysSinceMonday = (weekday + 6) % 7;
  return dayStart - daysSinceMonday * DAY_MS;
}

/** Aggregates settled amounts into today / this week / all-time balances. */
export function summarizeEarnings(entries: EarningsEntry[], now: Date = new Date()): EarningsSummary {
  const dayStart = startOfArgentineDay(now);
  const weekStart = startOfArgentineWeek(now);

  let today = 0;
  let week = 0;
  let total = 0;
  let count = 0;

  for (const entry of entries) {
    if (entry.driver_net_amount == null || !entry.completed_at) continue;
    const amount = Number(entry.driver_net_amount);
    const at = new Date(entry.completed_at).getTime();

    total += amount;
    count += 1;
    if (at >= weekStart) week += amount;
    if (at >= dayStart) today += amount;
  }

  return { today: round2(today), week: round2(week), total: round2(total), count };
}

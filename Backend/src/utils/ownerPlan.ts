/** Owner platform plan duration helpers (day-based). */

export function normalizeOwnerPlanDays(days: number): number {
  const d = Number(days);
  if (!Number.isFinite(d) || d <= 0) return 30;
  return Math.round(d);
}

/** Add plan duration in whole calendar days. */
export function addOwnerPlanDays(from: Date, days: number): Date {
  const result = new Date(from.getTime());
  result.setDate(result.getDate() + normalizeOwnerPlanDays(days));
  return result;
}

/**
 * Whole calendar days remaining until validUntil's date (inclusive of end day).
 * Example: bought today with 30-day plan → 30 days left.
 */
export function daysRemainingUntil(validUntil: Date, now = new Date()): number {
  const start = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const end = Date.UTC(
    validUntil.getFullYear(),
    validUntil.getMonth(),
    validUntil.getDate(),
  );
  const remaining = Math.round((end - start) / (1000 * 60 * 60 * 24));
  return Math.max(0, remaining);
}

/**
 * New purchases stack onto remaining time when the owner still has an active plan.
 * Otherwise start from now.
 */
export function computeOwnerPlanValidUntil(
  days: number,
  existingValidUntil: Date | null | undefined,
  now = new Date(),
): Date {
  const base =
    existingValidUntil && existingValidUntil.getTime() > now.getTime()
      ? existingValidUntil
      : now;
  return addOwnerPlanDays(base, days);
}

/**
 * OwnerSubscription.months stores duration in days for current plans (15/30/60).
 * Legacy rows stored calendar months (1–12); convert those for display/math.
 */
export function storedDurationToDays(stored: number): number {
  const n = Number(stored);
  if (!Number.isFinite(n) || n <= 0) return 30;
  if (n <= 12) return Math.round(n) * 30;
  return Math.round(n);
}

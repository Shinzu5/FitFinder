/** Extend from remaining time (or now if expired): base + purchased days. */
export function ComputeExtendedExpiresAtService(
  existingExpiresAt: Date | null | undefined,
  durationDays: number,
  now: Date = new Date(),
): Date {
  const base =
    existingExpiresAt && existingExpiresAt.getTime() > now.getTime()
      ? new Date(existingExpiresAt)
      : new Date(now);
  base.setDate(base.getDate() + durationDays);
  return base;
}

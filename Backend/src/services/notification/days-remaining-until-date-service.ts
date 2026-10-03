/** Whole calendar days remaining until expiresAt (inclusive of end day). */
export function DaysRemainingUntilDateService(expiresAt: Date, now = new Date()): number {
  const start = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const end = Date.UTC(
    expiresAt.getFullYear(),
    expiresAt.getMonth(),
    expiresAt.getDate(),
  );
  return Math.round((end - start) / (1000 * 60 * 60 * 24));
}

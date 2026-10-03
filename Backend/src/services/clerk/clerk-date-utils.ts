export const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Local midnight for a date (today's window). */
export function startOfLocalDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Calendar day as UTC midnight — what Prisma @db.Date expects. */
export function reportDateOnly(date = new Date()) {
  const d = startOfLocalDay(date);
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

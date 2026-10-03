export const FRONTEND_TO_TXN_TYPE: Record<
  string,
  "MONTHLY" | "SESSION" | "SUPPLEMENTS" | "DAY_PASS" | "RENEWAL" | "COACH"
> = {
  monthly: "MONTHLY",
  session: "SESSION",
  supplements: "SUPPLEMENTS",
  "day-pass": "DAY_PASS",
  renewal: "RENEWAL",
  coach: "COACH",
  MONTHLY: "MONTHLY",
  SESSION: "SESSION",
  SUPPLEMENTS: "SUPPLEMENTS",
  DAY_PASS: "DAY_PASS",
  RENEWAL: "RENEWAL",
  COACH: "COACH",
};

/** DB enum → frontend slug (DAY_PASS → day-pass). */
export function toFrontendTxnType(type: string): string {
  return type.toLowerCase().replace(/_/g, "-");
}

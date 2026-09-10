/**
 * Single source of truth for the backend origin.
 *
 * `NEXT_PUBLIC_API_URL` is baked in at `next build` time. Production (Vercel)
 * MUST set it to the deployed backend, e.g.
 * `https://<your-api>.onrender.com`. Leaving the localhost default while
 * serving `https://fitfinder.fun` makes every browser try
 * `http://localhost:5000/api/...` and surface a raw "Network Error".
 */
export function resolveApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
  return raw.replace(/\/+$/, "");
}

/**
 * True when the app is served from a non-local hostname but the API still
 * points at localhost — the exact misconfiguration behind the signup
 * "Network Error" on fitfinder.fun.
 */
export function isApiBaseMisconfigured(baseUrl?: string): boolean {
  if (typeof window === "undefined") return false;
  const base = (baseUrl ?? resolveApiBaseUrl()).toLowerCase();
  const pointsAtLocal =
    base.includes("localhost") || base.includes("127.0.0.1") || base.includes("0.0.0.0");
  if (!pointsAtLocal) return false;
  const host = window.location.hostname.toLowerCase();
  const isLocalHost =
    host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0";
  return !isLocalHost;
}

export function logApiBaseMisconfiguration(): void {
  if (typeof window === "undefined") return;
  if (isApiBaseMisconfigured()) {
    console.error(
      `[FitFinder] NEXT_PUBLIC_API_URL points at localhost (${process.env.NEXT_PUBLIC_API_URL}) ` +
        `while the app is served from https://${window.location.host}. ` +
        `Set NEXT_PUBLIC_API_URL to the production API URL and redeploy.`,
    );
  }
}

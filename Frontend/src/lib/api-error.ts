import axios from "axios";

/** Safe field access for loosely typed API JSON. */
export function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function getApiErrorStatus(error: unknown): number | undefined {
  if (axios.isAxiosError(error)) return error.response?.status;
  return undefined;
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { message?: string; errors?: Array<{ message?: string }> }
      | undefined;
    if (data?.errors?.length) {
      const joined = data.errors
        .map((item) => item.message)
        .filter(Boolean)
        .join(". ");
      if (joined) return joined;
    }
    if (data?.message) return data.message;
    // No response = request never reached the API (bad NEXT_PUBLIC_API_URL,
    // backend asleep/down, or CORS/offline). Don't leak raw "Network Error".
    if (!error.response) {
      return "Cannot reach the server. Please check your connection and try again. If this persists, the API may be down or misconfigured.";
    }
    if (error.message) return error.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

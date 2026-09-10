import axios from "axios";
import { logApiBaseMisconfiguration, resolveApiBaseUrl } from "@/lib/api-base";

const API_BASE_URL = resolveApiBaseUrl();

logApiBaseMisconfiguration();

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

/** In-memory access token — avoids race where Zustand persist hasn't written localStorage yet. */
let memoryAccessToken: string | null = null;

export function setMemoryAccessToken(token: string | null) {
  memoryAccessToken = token;
}

export function getMemoryAccessToken() {
  return memoryAccessToken;
}

function readStoredAccessToken(): string | null {
  if (memoryAccessToken) return memoryAccessToken;

  if (typeof window === "undefined") return null;
  try {
    const authStorage = localStorage.getItem("fitfinder-auth-v2");
    if (!authStorage) return null;
    const parsed = JSON.parse(authStorage);
    return parsed?.state?.accessToken || null;
  } catch {
    return null;
  }
}

function isAuthEndpoint(url?: string) {
  if (!url) return false;
  return (
    url.includes("/auth/login") ||
    url.includes("/auth/logout") ||
    url.includes("/auth/refresh") ||
    url.includes("/auth/register") ||
    url.includes("/auth/verify-email") ||
    url.includes("/auth/forgot-password") ||
    url.includes("/auth/verify-reset-code") ||
    url.includes("/auth/reset-password") ||
    url.includes("/auth/resend-verification")
  );
}

// Request interceptor — attach access token
api.interceptors.request.use((config) => {
  const token = readStoredAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle 401 and auto-refresh (never on auth endpoints)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest) return Promise.reject(error);

    const status = error.response?.status;
    const alreadyRetried = Boolean(originalRequest._retry);

    // Never try to refresh while logging in / out / refreshing — that caused
    // "Refresh token required" during account switch / login.
    if (status !== 401 || alreadyRetried || isAuthEndpoint(originalRequest.url)) {
      return Promise.reject(error);
    }

    // Account deleted / clerk removed — do not refresh; force login with notice
    if (error.response?.data?.code === "ACCOUNT_DELETED") {
      setMemoryAccessToken(null);
      if (typeof window !== "undefined") {
        const message =
          error.response?.data?.message ||
          "Your account has been removed. Please sign in again.";
        sessionStorage.setItem("fitfinder-account-removed", message);
        localStorage.removeItem("fitfinder-auth-v2");
        try {
          const { useAuthStore } = await import("@/stores/auth-store");
          useAuthStore.getState().clearSession();
        } catch {
          // ignore
        }
        try {
          const { disconnectSocket } = await import("@/lib/socket");
          disconnectSocket();
        } catch {
          // ignore
        }
        if (!window.location.pathname.startsWith("/login")) {
          window.location.href = "/login?removed=1";
        }
      }
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const { data } = await axios.post(
        `${API_BASE_URL}/api/auth/refresh`,
        {},
        { withCredentials: true },
      );

      const newToken = data?.data?.accessToken;
      const refreshedUser = data?.data?.user;
      if (!newToken) {
        return Promise.reject(error);
      }

      setMemoryAccessToken(newToken);

      if (typeof window !== "undefined") {
        const authStorage = localStorage.getItem("fitfinder-auth-v2");
        if (authStorage) {
          const parsed = JSON.parse(authStorage);
          parsed.state = {
            ...parsed.state,
            accessToken: newToken,
            isAuthenticated: true,
            ...(refreshedUser?.role
              ? {
                  user: {
                    ...(parsed.state?.user || {}),
                    id: refreshedUser.id,
                    fullName: refreshedUser.fullName,
                    email: refreshedUser.email,
                    role: refreshedUser.role,
                    avatarUrl: refreshedUser.avatarUrl || undefined,
                  },
                  role: refreshedUser.role,
                }
              : {}),
          };
          localStorage.setItem("fitfinder-auth-v2", JSON.stringify(parsed));
        }

        // Keep Zustand in sync when available — restore DB role, never invent one
        try {
          const { useAuthStore } = await import("@/stores/auth-store");
          if (refreshedUser?.role) {
            useAuthStore.setState({
              accessToken: newToken,
              isAuthenticated: true,
              user: {
                id: refreshedUser.id,
                fullName: refreshedUser.fullName,
                email: refreshedUser.email,
                role: refreshedUser.role,
                avatarUrl: refreshedUser.avatarUrl || undefined,
              },
              role: refreshedUser.role,
            });
          } else {
            useAuthStore.setState({ accessToken: newToken, isAuthenticated: true });
          }
        } catch {
          // ignore circular import timing
        }
      }

      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return api(originalRequest);
    } catch (refreshError: unknown) {
      setMemoryAccessToken(null);

      const refreshData = (
        refreshError as { response?: { data?: { code?: string } } }
      )?.response?.data;
      const deleted = refreshData?.code === "ACCOUNT_DELETED";

      if (typeof window !== "undefined") {
        localStorage.removeItem("fitfinder-auth-v2");
        try {
          const { useAuthStore } = await import("@/stores/auth-store");
          useAuthStore.setState({
            user: null,
            role: null,
            accessToken: null,
            isAuthenticated: false,
          });
        } catch {
          // ignore
        }

        if (deleted) {
          sessionStorage.setItem(
            "fitfinder-account-removed",
            "Your account has been removed. Please sign in again.",
          );
          if (!window.location.pathname.startsWith("/login")) {
            window.location.href = "/login?removed=1";
          }
        } else if (!window.location.pathname.startsWith("/login")) {
          window.location.href = "/login";
        }
      }

      return Promise.reject(refreshError);
    }
  },
);

export default api;

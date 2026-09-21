import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

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

// Promise lock to prevent parallel duplicate /auth/refresh calls
let refreshPromise: Promise<string> | null = null;

// Response interceptor — handle 401 and auto-refresh (never on auth endpoints)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest) return Promise.reject(error);

    const status = error.response?.status;
    const alreadyRetried = Boolean(originalRequest._retry);

    // Never try to refresh while logging in / out / refreshing or if no token was stored (logged out user)
    const storedToken = readStoredAccessToken();
    if (status !== 401 || alreadyRetried || isAuthEndpoint(originalRequest.url) || !storedToken) {
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
      if (!refreshPromise) {
        refreshPromise = (async () => {
          const { data } = await axios.post(
            `${API_BASE_URL}/api/auth/refresh`,
            {},
            { withCredentials: true },
          );

          const newToken = data?.data?.accessToken;
          const refreshedUser = data?.data?.user;
          if (!newToken) {
            throw new Error("No token returned");
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
              // ignore
            }
          }
          return newToken as string;
        })().finally(() => {
          refreshPromise = null;
        });
      }

      const newToken = await refreshPromise;
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return api(originalRequest);
    } catch (refreshError: unknown) {
      setMemoryAccessToken(null);

      const refreshResponse = (
        refreshError as { response?: { data?: { code?: string; errors?: { code?: string } } } }
      )?.response?.data;
      // The refresh endpoint returns code at top-level for some errors and under errors.code for others
      const deletedCode = refreshResponse?.code ?? refreshResponse?.errors?.code;
      const deleted = deletedCode === "ACCOUNT_DELETED";

      if (typeof window !== "undefined") {
        localStorage.removeItem("fitfinder-auth-v2");
        try {
          const { useAuthStore } = await import("@/stores/auth-store");
          useAuthStore.getState().clearSession();
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

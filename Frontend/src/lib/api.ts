import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor — attach access token
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const authStorage = localStorage.getItem("fitfinder-auth-v2");
    if (authStorage) {
      try {
        const parsed = JSON.parse(authStorage);
        const token = parsed?.state?.accessToken;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch {}
    }
  }
  return config;
});

// Response interceptor — handle 401 and auto-refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const { data } = await axios.post(
          `${API_BASE_URL}/api/auth/refresh`,
          {},
          { withCredentials: true }
        );

        if (data?.data?.accessToken) {
          // Update token in localStorage
          const authStorage = localStorage.getItem("fitfinder-auth-v2");
          if (authStorage) {
            const parsed = JSON.parse(authStorage);
            parsed.state.accessToken = data.data.accessToken;
            localStorage.setItem("fitfinder-auth-v2", JSON.stringify(parsed));
          }

          originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed — clear auth state
        if (typeof window !== "undefined") {
          localStorage.removeItem("fitfinder-auth-v2");
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  type AuthSession,
  mockForgotPassword,
  mockLogin,
  mockRegister,
  removeMockSessionFromStorage,
  setMockSessionInStorage,
  getMockSessionFromStorage,
  type LoginPayload,
  type RegisterPayload,
} from "@/lib/auth";
import { roleToDashboardPath, type UserRole } from "@/lib/mock-users";

interface AuthState {
  user: AuthSession["user"] | null;
  role: UserRole | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  success: string | null;
  login: (payload: LoginPayload) => Promise<boolean>;
  register: (payload: RegisterPayload) => Promise<boolean>;
  forgotPassword: (email: string) => Promise<boolean>;
  logout: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      role: null,
      accessToken: null,
      isAuthenticated: false,
      loading: false,
      error: null,
      success: null,

      hydrate: () => {
        set({ loading: true });
        const persisted = getMockSessionFromStorage(window.sessionStorage);
        const remembered = getMockSessionFromStorage(window.localStorage);
        const session = remembered ?? persisted;

        if (session) {
          set({
            user: session.user,
            role: session.role,
            accessToken: session.accessToken,
            isAuthenticated: session.isAuthenticated,
            loading: false,
            error: null,
            success: null,
          });
          return;
        }

        set({ loading: false });
      },

      login: async (payload) => {
        set({ loading: true, error: null, success: null });
        const session = mockLogin(payload);

        if (!session) {
          set({ loading: false, error: "Invalid email or password.", success: null });
          return false;
        }

        const targetStorage = payload.rememberMe ? window.localStorage : window.sessionStorage;
        setMockSessionInStorage(targetStorage, session);
        removeMockSessionFromStorage(!payload.rememberMe ? window.localStorage : window.sessionStorage);

        set({
          user: session.user,
          role: session.role,
          accessToken: session.accessToken,
          isAuthenticated: true,
          loading: false,
          error: null,
          success: "Welcome back!",
        });
        return true;
      },

      register: async (payload) => {
        set({ loading: true, error: null, success: null });

        if (payload.password.length < 8) {
          set({ loading: false, error: "Password must be at least 8 characters.", success: null });
          return false;
        }

        if (payload.password !== payload.confirmPassword) {
          set({ loading: false, error: "Passwords do not match.", success: null });
          return false;
        }

        const session = mockRegister(payload);
        if (!session) {
          set({ loading: false, error: "An account with that email already exists.", success: null });
          return false;
        }

        // Create the user in the mock store but do not auto-authenticate.
        // User should sign in after registering.
        set({ loading: false, error: null, success: "Account created successfully." });
        return true;
      },

      forgotPassword: async (email) => {
        set({ loading: true, error: null, success: null });
        const ok = mockForgotPassword(email);
        set({ loading: false, error: null, success: ok ? "If an account exists for this email, a password reset link has been sent." : "If an account exists for this email, a password reset link has been sent." });
        return true;
      },

      logout: () => {
        removeMockSessionFromStorage(window.localStorage);
        removeMockSessionFromStorage(window.sessionStorage);
        set({ user: null, role: null, accessToken: null, isAuthenticated: false, loading: false, error: null, success: null });
      },
    }),
    {
      name: "fitfinder-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        role: state.role,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

export const getDashboardPathForRole = (role: UserRole | null) => {
  if (!role) return "/dashboard/user";
  return roleToDashboardPath[role];
};

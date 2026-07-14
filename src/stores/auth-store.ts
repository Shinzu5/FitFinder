"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AuthUser, LoginPayload, RegisterPayload } from "@/lib/auth/types";
import {
  apiLoginInit,
  apiRegister,
  apiResendLoginCode,
  apiResendRegistrationCode,
  apiVerifyLogin,
  apiVerifyRegistration,
  LOGIN_CHALLENGE_STORAGE_KEY,
} from "@/lib/auth/auth-api";
import { roleToDashboardPath, type UserRole } from "@/lib/mock-users";

interface AuthState {
  user: AuthUser | null;
  role: UserRole | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  loading: boolean;
  error: string | null;
  success: string | null;
  pendingLoginEmail: string | null;
  login: (payload: LoginPayload) => Promise<
    | { ok: true; requiresVerification: true; email: string }
    | { ok: true; requiresVerification: false }
    | { ok: false }
  >;
  register: (payload: RegisterPayload) => Promise<{ ok: true; email: string } | { ok: false }>;
  verifyRegistration: (email: string, code: string) => Promise<boolean>;
  resendRegistrationCode: (email: string) => Promise<boolean>;
  verifyLogin: (code: string) => Promise<boolean>;
  resendLoginCode: () => Promise<boolean>;
  forgotPassword: (email: string) => Promise<boolean>;
  logout: () => void;
  promoteToOwner: () => void;
  demoteToUser: () => void;
  setHasHydrated: (value: boolean) => void;
  updateProfileAvatar: (avatarUrl: string) => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      role: null,
      accessToken: null,
      isAuthenticated: false,
      hasHydrated: false,
      loading: false,
      error: null,
      success: null,
      pendingLoginEmail: null,

      setHasHydrated: (value) => set({ hasHydrated: value }),

      login: async (payload) => {
        set({ loading: true, error: null, success: null, pendingLoginEmail: null });

        try {
          const response = await apiLoginInit(payload);
          sessionStorage.setItem(LOGIN_CHALLENGE_STORAGE_KEY, response.loginToken);
          set({
            loading: false,
            pendingLoginEmail: response.email,
            success: response.message,
            error: null,
          });
          return { ok: true, requiresVerification: true, email: response.email };
        } catch (error) {
          set({
            loading: false,
            error: error instanceof Error ? error.message : "Unable to sign in.",
            success: null,
          });
          return { ok: false };
        }
      },

      register: async (payload) => {
        set({ loading: true, error: null, success: null });

        if (payload.password.length < 8) {
          set({ loading: false, error: "Password must be at least 8 characters.", success: null });
          return { ok: false };
        }

        if (payload.password !== payload.confirmPassword) {
          set({ loading: false, error: "Passwords do not match.", success: null });
          return { ok: false };
        }

        try {
          const response = await apiRegister(payload);
          set({
            loading: false,
            error: null,
            success: response.message,
          });
          return { ok: true, email: response.email };
        } catch (error) {
          set({
            loading: false,
            error: error instanceof Error ? error.message : "Unable to register.",
            success: null,
          });
          return { ok: false };
        }
      },

      verifyRegistration: async (email, code) => {
        set({ loading: true, error: null, success: null });
        try {
          const response = await apiVerifyRegistration(email, code);
          set({ loading: false, success: response.message, error: null });
          return true;
        } catch (error) {
          set({
            loading: false,
            error: error instanceof Error ? error.message : "Verification failed.",
            success: null,
          });
          return false;
        }
      },

      resendRegistrationCode: async (email) => {
        set({ error: null, success: null });
        try {
          const response = await apiResendRegistrationCode(email);
          set({ success: response.message, error: null });
          return true;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Unable to resend code.",
            success: null,
          });
          return false;
        }
      },

      verifyLogin: async (code) => {
        set({ loading: true, error: null, success: null });
        const loginToken = sessionStorage.getItem(LOGIN_CHALLENGE_STORAGE_KEY);

        if (!loginToken) {
          set({
            loading: false,
            error: "Login session expired. Please sign in again.",
            success: null,
          });
          return false;
        }

        try {
          const response = await apiVerifyLogin(loginToken, code);
          sessionStorage.removeItem(LOGIN_CHALLENGE_STORAGE_KEY);
          set({
            user: response.user,
            role: response.role,
            accessToken: response.accessToken,
            isAuthenticated: true,
            pendingLoginEmail: null,
            loading: false,
            error: null,
            success: response.message,
          });
          return true;
        } catch (error) {
          set({
            loading: false,
            error: error instanceof Error ? error.message : "Verification failed.",
            success: null,
          });
          return false;
        }
      },

      resendLoginCode: async () => {
        set({ error: null, success: null });
        const loginToken = sessionStorage.getItem(LOGIN_CHALLENGE_STORAGE_KEY);

        if (!loginToken) {
          set({ error: "Login session expired. Please sign in again.", success: null });
          return false;
        }

        try {
          const response = await apiResendLoginCode(loginToken);
          set({ success: response.message, error: null });
          return true;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Unable to resend code.",
            success: null,
          });
          return false;
        }
      },

      forgotPassword: async (_email) => {
        set({
          loading: false,
          error: null,
          success:
            "If an account exists for this email, a password reset link has been sent.",
        });
        return true;
      },

      promoteToOwner: () => {
        const user = get().user;
        if (!user) return;
        set({
          user: { ...user, role: "OWNER" },
          role: "OWNER",
        });
      },

      demoteToUser: () => {
        const user = get().user;
        if (!user) return;
        set({
          user: { ...user, role: "USER" },
          role: "USER",
        });
      },

      updateProfileAvatar: (avatarUrl) => {
        const user = get().user;
        if (!user) return;
        set({ user: { ...user, avatarUrl } });
      },

      changePassword: async (_currentPassword, newPassword) => {
        if (newPassword.length < 8) {
          set({ error: "New password must be at least 8 characters.", success: null });
          return false;
        }

        set({
          error: "Password changes are not available in this demo yet.",
          success: null,
        });
        return false;
      },

      logout: () => {
        sessionStorage.removeItem(LOGIN_CHALLENGE_STORAGE_KEY);
        set({
          user: null,
          role: null,
          accessToken: null,
          isAuthenticated: false,
          pendingLoginEmail: null,
          loading: false,
          error: null,
          success: null,
        });
      },
    }),
    {
      name: "fitfinder-auth-v2",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        role: state.role,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);

export const getDashboardPathForRole = (role: UserRole | null) => {
  if (!role) return "/dashboard/user";
  return roleToDashboardPath[role];
};

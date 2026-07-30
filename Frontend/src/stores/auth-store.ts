"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import api from "@/lib/api";
import { type UserRole, roleToDashboardPath } from "@/lib/mock-users";

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  password?: string;
}

interface AuthState {
  user: AuthUser | null;
  role: UserRole | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  loading: boolean;
  error: string | null;
  success: string | null;
  login: (payload: { email: string; password: string; rememberMe: boolean }) => Promise<boolean>;
  register: (payload: {
    fullName: string;
    email: string;
    password: string;
    confirmPassword: string;
    role: string;
  }) => Promise<boolean>;
  verifyEmail: (email: string, code: string) => Promise<boolean>;
  resendVerification: (email: string) => Promise<boolean>;
  forgotPassword: (email: string) => Promise<boolean>;
  resetPassword: (email: string, code: string, newPassword: string) => Promise<boolean>;
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

      setHasHydrated: (value) => set({ hasHydrated: value }),

      login: async (payload) => {
        set({ loading: true, error: null, success: null });
        try {
          const { data } = await api.post("/auth/login", payload);

          if (data.success) {
            set({
              user: data.data.user,
              role: data.data.user.role,
              accessToken: data.data.accessToken,
              isAuthenticated: true,
              loading: false,
              error: null,
              success: "Welcome back!",
            });
            return true;
          }

          set({ loading: false, error: data.message || "Login failed.", success: null });
          return false;
        } catch (error: any) {
          const message = error.response?.data?.message || "Invalid email or password.";
          set({ loading: false, error: message, success: null });
          return false;
        }
      },

      register: async (payload) => {
        set({ loading: true, error: null, success: null });
        try {
          if (payload.password.length < 8) {
            set({ loading: false, error: "Password must be at least 8 characters.", success: null });
            return false;
          }

          if (payload.password !== payload.confirmPassword) {
            set({ loading: false, error: "Passwords do not match.", success: null });
            return false;
          }

          const { data } = await api.post("/auth/register", payload);

          if (data.success) {
            set({
              loading: false,
              error: null,
              success: data.message || "Account created. Please check your email for the verification code.",
            });
            return true;
          }

          set({ loading: false, error: data.message || "Registration failed.", success: null });
          return false;
        } catch (error: any) {
          const message = error.response?.data?.message || "Registration failed.";
          // Handle validation errors
          const errors = error.response?.data?.errors;
          const errorMsg = errors?.length
            ? errors.map((e: any) => e.message).join(". ")
            : message;
          set({ loading: false, error: errorMsg, success: null });
          return false;
        }
      },

      verifyEmail: async (email, code) => {
        set({ loading: true, error: null, success: null });
        try {
          const { data } = await api.post("/auth/verify-email", { email, code });

          if (data.success) {
            set({ loading: false, error: null, success: data.message || "Email verified!" });
            return true;
          }

          set({ loading: false, error: data.message || "Verification failed.", success: null });
          return false;
        } catch (error: any) {
          const message = error.response?.data?.message || "Verification failed.";
          set({ loading: false, error: message, success: null });
          return false;
        }
      },

      resendVerification: async (email) => {
        set({ loading: true, error: null, success: null });
        try {
          const { data } = await api.post("/auth/resend-verification", { email });
          set({
            loading: false,
            error: null,
            success: data.message || "A new verification code has been sent.",
          });
          return true;
        } catch (error: any) {
          set({
            loading: false,
            error: error.response?.data?.message || "Failed to resend code.",
            success: null,
          });
          return false;
        }
      },

      forgotPassword: async (email) => {
        set({ loading: true, error: null, success: null });
        try {
          const { data } = await api.post("/auth/forgot-password", { email });
          set({
            loading: false,
            error: null,
            success:
              data.message ||
              "If an account exists for this email, a password reset code has been sent.",
          });
          return true;
        } catch (error: any) {
          set({
            loading: false,
            error: null,
            success: "If an account exists for this email, a password reset code has been sent.",
          });
          return true;
        }
      },

      resetPassword: async (email, code, newPassword) => {
        set({ loading: true, error: null, success: null });
        try {
          const { data } = await api.post("/auth/reset-password", {
            email,
            code,
            newPassword,
          });

          if (data.success) {
            set({
              loading: false,
              error: null,
              success: data.message || "Password reset successfully.",
            });
            return true;
          }

          set({ loading: false, error: data.message, success: null });
          return false;
        } catch (error: any) {
          set({
            loading: false,
            error: error.response?.data?.message || "Failed to reset password.",
            success: null,
          });
          return false;
        }
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

      updateProfileAvatar: async (avatarUrl) => {
        const user = get().user;
        if (!user) return;

        try {
          await api.put("/auth/me", { avatarUrl });
        } catch {}

        set({ user: { ...user, avatarUrl } });
      },

      changePassword: async (currentPassword, newPassword) => {
        const user = get().user;
        if (!user) return false;

        if (newPassword.length < 8) {
          set({ error: "New password must be at least 8 characters.", success: null });
          return false;
        }

        try {
          const { data } = await api.put("/auth/change-password", {
            currentPassword,
            newPassword,
          });

          if (data.success) {
            set({ error: null, success: "Password updated successfully." });
            return true;
          }

          set({ error: data.message || "Failed to change password.", success: null });
          return false;
        } catch (error: any) {
          set({
            error: error.response?.data?.message || "Current password is incorrect.",
            success: null,
          });
          return false;
        }
      },

      logout: async () => {
        try {
          await api.post("/auth/logout");
        } catch {}

        // Clear other persisted stores to prevent state leakage between accounts
        localStorage.removeItem("fitfinder-create-gym");
        localStorage.removeItem("fitfinder-membership");
        localStorage.removeItem("fitfinder-owner-coaches");
        localStorage.removeItem("fitfinder-owner-equipment");
        localStorage.removeItem("fitfinder-owner-plans");
        localStorage.removeItem("fitfinder-admin-gym-approvals-v2");

        set({
          user: null,
          role: null,
          accessToken: null,
          isAuthenticated: false,
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

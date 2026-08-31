"use client";

import { create } from "zustand";
import api from "@/lib/api";

export type AdminUserTab = "users" | "owner" | "clerk";
export type PlatformUserStatus = "active" | "inactive" | "expired";

export interface PlatformUser {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string;
  joinedAt: string;
  status: PlatformUserStatus;
  tab: AdminUserTab;
  gymName?: string | null;
  gymOwnerName?: string | null;
}

export function getPlatformUserStatusStyles(status: PlatformUserStatus) {
  if (status === "expired") {
    return "border-red-500/30 bg-red-500/10 text-red-400";
  }
  if (status === "inactive") {
    return "border-zinc-500/30 bg-zinc-500/10 text-zinc-400";
  }
  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
}

export function formatJoinedDate(isoDate: string) {
  const date = new Date(`${isoDate}T12:00:00`);
  return date.toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  });
}

function roleToTab(role: string): AdminUserTab {
  if (role === "OWNER") return "owner";
  if (role === "CLERK") return "clerk";
  return "users";
}

interface AdminUsersState {
  users: PlatformUser[];
  loading: boolean;
  fetchUsers: (opts?: { silent?: boolean }) => Promise<void>;
  removeUser: (id: string) => Promise<void>;
}

export const useAdminUsersStore = create<AdminUsersState>((set, get) => ({
  users: [],
  loading: false,

  fetchUsers: async (opts) => {
    const silent = Boolean(opts?.silent) || get().users.length > 0;
    if (!silent) set({ loading: true });
    try {
      const { data } = await api.get("/admin/users");
      if (data.success) {
        const mapped = (data.data || [])
          .filter((u: { role: string }) => u.role !== "ADMIN")
          .map(
            (u: {
              id: string;
              fullName: string;
              email: string;
              avatarUrl?: string | null;
              createdAt?: string;
              emailVerified?: boolean;
              role: string;
              status?: string;
              gymName?: string | null;
              gymOwnerName?: string | null;
            }) => {
              const raw = String(u.status || "").toLowerCase();
              const status: PlatformUserStatus =
                raw === "expired"
                  ? "expired"
                  : raw === "inactive" || (!u.emailVerified && raw !== "active")
                    ? "inactive"
                    : raw === "active"
                      ? "active"
                      : u.emailVerified
                        ? "active"
                        : "inactive";

              return {
                id: u.id,
                fullName: u.fullName,
                email: u.email,
                avatarUrl: u.avatarUrl || "",
                joinedAt: u.createdAt?.split("T")[0] || "",
                status,
                tab: roleToTab(u.role),
                gymName: u.gymName ?? null,
                gymOwnerName: u.gymOwnerName ?? null,
              };
            },
          );
        set({ users: mapped, loading: false });
        return;
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
    set({ loading: false });
  },

  removeUser: async (id) => {
    const target = get().users.find((u) => u.id === id);
    if (target?.tab === "clerk") {
      throw new Error("Clerk accounts can only be removed by their Gym Owner");
    }

    try {
      const { data } = await api.delete(`/admin/users/${id}`);
      if (!data?.success) {
        throw new Error(data?.message || "Failed to remove user");
      }
      set({ users: get().users.filter((u) => u.id !== id) });
      void get().fetchUsers({ silent: true });
    } catch (error: unknown) {
      console.error("Failed to remove user:", error);
      const message =
        (error as { response?: { data?: { message?: string } }; message?: string })?.response
          ?.data?.message ||
        (error as { message?: string })?.message ||
        "Failed to remove user";
      throw new Error(message);
    }
  },
}));

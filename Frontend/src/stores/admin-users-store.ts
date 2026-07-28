"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import api from "@/lib/api";

export type AdminUserTab = "users" | "owner" | "clerk";
export type PlatformUserStatus = "active" | "inactive";

export interface PlatformUser {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string;
  joinedAt: string;
  status: PlatformUserStatus;
  tab: AdminUserTab;
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
  fetchUsers: () => Promise<void>;
  removeUser: (id: string) => Promise<void>;
}

export const useAdminUsersStore = create<AdminUsersState>()(
  persist(
    (set, get) => ({
      users: [],
      loading: false,

      fetchUsers: async () => {
        set({ loading: true });
        try {
          const { data } = await api.get("/admin/users");
          if (data.success) {
            const mapped = data.data
              .filter((u: any) => u.role !== "ADMIN")
              .map((u: any) => ({
                id: u.id,
                fullName: u.fullName,
                email: u.email,
                avatarUrl: u.avatarUrl || "",
                joinedAt: u.createdAt?.split("T")[0] || "",
                status: "active" as const,
                tab: roleToTab(u.role),
              }));
            set({ users: mapped, loading: false });
            return;
          }
        } catch (error) {
          console.error("Failed to fetch users:", error);
        }
        set({ loading: false });
      },

      removeUser: async (id) => {
        try {
          await api.delete(`/admin/users/${id}`);
        } catch (error) {
          console.error("Failed to remove user:", error);
        }
        set({ users: get().users.filter((u) => u.id !== id) });
      },
    }),
    {
      name: "fitfinder-admin-users",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

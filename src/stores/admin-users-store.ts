"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

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

const DEFAULT_USERS: PlatformUser[] = [
  {
    id: "pu-1",
    fullName: "Alex Cruz",
    email: "alex.cruz@example.com",
    avatarUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
    joinedAt: "2026-05-26",
    status: "active",
    tab: "users",
  },
  {
    id: "pu-2",
    fullName: "Maria Santos",
    email: "maria.santos@example.com",
    avatarUrl:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80",
    joinedAt: "2026-05-26",
    status: "active",
    tab: "users",
  },
  {
    id: "pu-3",
    fullName: "Pedro Penduko",
    email: "pedro.penduko@example.com",
    avatarUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
    joinedAt: "2026-05-26",
    status: "active",
    tab: "users",
  },
  {
    id: "po-1",
    fullName: "Renz Aballe",
    email: "renz@example.com",
    avatarUrl:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80",
    joinedAt: "2026-04-12",
    status: "active",
    tab: "owner",
  },
  {
    id: "po-2",
    fullName: "Liza Gomez",
    email: "liza@powerhouse.fit",
    avatarUrl:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80",
    joinedAt: "2026-03-08",
    status: "active",
    tab: "owner",
  },
  {
    id: "po-3",
    fullName: "Owner User",
    email: "owner@test.com",
    avatarUrl:
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=200&q=80",
    joinedAt: "2026-02-15",
    status: "active",
    tab: "owner",
  },
  {
    id: "pc-1",
    fullName: "Ana Reyes",
    email: "clerk@test.com",
    avatarUrl:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80",
    joinedAt: "2026-01-20",
    status: "active",
    tab: "clerk",
  },
  {
    id: "pc-2",
    fullName: "Jake Morales",
    email: "jake.morales@example.com",
    avatarUrl:
      "https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=200&q=80",
    joinedAt: "2026-05-10",
    status: "active",
    tab: "clerk",
  },
];

export function formatJoinedDate(isoDate: string) {
  const date = new Date(`${isoDate}T12:00:00`);
  return date.toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  });
}

interface AdminUsersState {
  users: PlatformUser[];
  removeUser: (id: string) => void;
}

export const useAdminUsersStore = create<AdminUsersState>()(
  persist(
    (set, get) => ({
      users: DEFAULT_USERS,

      removeUser: (id) => {
        set({ users: get().users.filter((user) => user.id !== id) });
      },
    }),
    {
      name: "fitfinder-admin-users",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

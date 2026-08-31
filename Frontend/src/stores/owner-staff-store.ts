"use client";

import { create } from "zustand";
import api from "@/lib/api";

export interface FrontDeskClerk {
  id: string;
  fullName: string;
  email: string;
}

export interface AddClerkResult {
  ok: boolean;
  message?: string;
}

interface OwnerStaffState {
  clerks: FrontDeskClerk[];
  loading: boolean;
  fetchStaff: () => Promise<void>;
  addClerk: (clerk: {
    fullName: string;
    email: string;
    password: string;
  }) => Promise<AddClerkResult>;
  removeClerk: (id: string) => Promise<void>;
  clearStaff: () => void;
}

export const useOwnerStaffStore = create<OwnerStaffState>((set, get) => ({
  clerks: [],
  loading: false,

  clearStaff: () => set({ clerks: [], loading: false }),

  fetchStaff: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get("/owner/staff");
      if (data.success) {
        set({ clerks: data.data || [], loading: false });
        return;
      }
      // No gym / empty — never keep stale clerks
      set({ clerks: [], loading: false });
    } catch (error) {
      console.error("Failed to fetch staff:", error);
      set({ clerks: [], loading: false });
    }
  },

  addClerk: async (clerk) => {
    try {
      const { data } = await api.post("/owner/staff", clerk);
      if (data.success) {
        set({ clerks: [...get().clerks, data.data] });
        return { ok: true };
      }
      return { ok: false, message: data.message || "Failed to create clerk account." };
    } catch (error: any) {
      console.error("Failed to add clerk:", error);
      const message =
        error?.response?.data?.message ||
        "Failed to create clerk account. Please check your connection and try again.";
      return { ok: false, message };
    }
  },

  removeClerk: async (id) => {
    try {
      await api.delete(`/owner/staff/${id}`);
    } catch (error) {
      console.error("Failed to remove clerk:", error);
    }
    set({ clerks: get().clerks.filter((c) => c.id !== id) });
  },
}));

export function getClerkInitials(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

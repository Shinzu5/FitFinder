"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import api from "@/lib/api";

export interface FrontDeskClerk {
  id: string;
  fullName: string;
  email: string;
}

interface OwnerStaffState {
  clerks: FrontDeskClerk[];
  loading: boolean;
  fetchStaff: () => Promise<void>;
  addClerk: (clerk: Omit<FrontDeskClerk, "id">) => Promise<boolean>;
  removeClerk: (id: string) => Promise<void>;
}

export const useOwnerStaffStore = create<OwnerStaffState>()(
  persist(
    (set, get) => ({
      clerks: [],
      loading: false,

      fetchStaff: async () => {
        set({ loading: true });
        try {
          const { data } = await api.get("/owner/staff");
          if (data.success) {
            set({ clerks: data.data, loading: false });
            return;
          }
        } catch (error) {
          console.error("Failed to fetch staff:", error);
        }
        set({ loading: false });
      },

      addClerk: async (clerk) => {
        try {
          const { data } = await api.post("/owner/staff", clerk);
          if (data.success) {
            set({ clerks: [...get().clerks, data.data] });
            return true;
          }
        } catch (error) {
          console.error("Failed to add clerk:", error);
        }

        const email = clerk.email.trim().toLowerCase();
        const exists = get().clerks.some((c) => c.email.toLowerCase() === email);
        if (exists) return false;

        set({
          clerks: [
            ...get().clerks,
            {
              id: `clerk-${Date.now()}`,
              fullName: clerk.fullName.trim(),
              email: clerk.email.trim(),
            },
          ],
        });
        return true;
      },

      removeClerk: async (id) => {
        try {
          await api.delete(`/owner/staff/${id}`);
        } catch (error) {
          console.error("Failed to remove clerk:", error);
        }
        set({ clerks: get().clerks.filter((c) => c.id !== id) });
      },
    }),
    {
      name: "fitfinder-owner-staff",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export function getClerkInitials(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface FrontDeskClerk {
  id: string;
  fullName: string;
  email: string;
}

interface OwnerStaffState {
  clerks: FrontDeskClerk[];
  addClerk: (clerk: Omit<FrontDeskClerk, "id">) => boolean;
  removeClerk: (id: string) => void;
}

const DEFAULT_CLERKS: FrontDeskClerk[] = [
  { id: "clerk-1", fullName: "Ana Reyes", email: "ana@abbsy.com" },
];

export const useOwnerStaffStore = create<OwnerStaffState>()(
  persist(
    (set, get) => ({
      clerks: DEFAULT_CLERKS,

      addClerk: (clerk) => {
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

      removeClerk: (id) => {
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

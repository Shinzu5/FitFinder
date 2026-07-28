"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import api from "@/lib/api";

export interface GymCoach {
  id: string;
  name: string;
  specialty: string;
  sessionPrice: number;
  schedule: Record<string, string>;
  description: string;
  photoUrl: string | null;
  photoName: string | null;
}

export type GymCoachInput = Omit<GymCoach, "id">;

export interface CoachSchedule {
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
  saturday: string;
  sunday: string;
}

export const WEEK_DAYS = [
  { key: "monday", label: "Monday", short: "Mon" },
  { key: "tuesday", label: "Tuesday", short: "Tue" },
  { key: "wednesday", label: "Wednesday", short: "Wed" },
  { key: "thursday", label: "Thursday", short: "Thu" },
  { key: "friday", label: "Friday", short: "Fri" },
  { key: "saturday", label: "Saturday", short: "Sat" },
  { key: "sunday", label: "Sunday", short: "Sun" },
] as const;

export type WeekDayKey = (typeof WEEK_DAYS)[number]["key"];

export const EMPTY_SCHEDULE: CoachSchedule = {
  monday: "", tuesday: "", wednesday: "", thursday: "",
  friday: "", saturday: "", sunday: "",
};

interface OwnerCoachesState {
  coaches: GymCoach[];
  loading: boolean;
  fetchCoaches: () => Promise<void>;
  addCoach: (coach: GymCoachInput) => Promise<void>;
  removeCoach: (id: string) => Promise<void>;
}

export const useOwnerCoachesStore = create<OwnerCoachesState>()(
  persist(
    (set, get) => ({
      coaches: [],
      loading: false,

      fetchCoaches: async () => {
        set({ loading: true });
        try {
          const { data } = await api.get("/owner/coaches");
          if (data.success) {
            set({ coaches: data.data, loading: false });
            return;
          }
        } catch (error) {
          console.error("Failed to fetch coaches:", error);
        }
        set({ loading: false });
      },

      addCoach: async (coach) => {
        try {
          const { data } = await api.post("/owner/coaches", coach);
          if (data.success) {
            set({ coaches: [...get().coaches, data.data] });
            return;
          }
        } catch (error) {
          console.error("Failed to add coach:", error);
        }
        set({
          coaches: [
            ...get().coaches,
            { id: `coach-${Date.now()}`, ...coach },
          ],
        });
      },

      removeCoach: async (id) => {
        try {
          await api.delete(`/owner/coaches/${id}`);
        } catch (error) {
          console.error("Failed to remove coach:", error);
        }
        set({ coaches: get().coaches.filter((c) => c.id !== id) });
      },
    }),
    {
      name: "fitfinder-owner-coaches",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export function getCoachInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

export function formatSessionPrice(price: number) {
  return `₱${price.toLocaleString()}/session`;
}

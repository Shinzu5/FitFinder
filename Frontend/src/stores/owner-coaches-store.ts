"use client";

import { create } from "zustand";
import api from "@/lib/api";
import { asRecord } from "@/lib/api-error";

export interface GymCoach {
  id: string;
  name: string;
  specialty: string;
  sessionPrice: number;
  schedule: Record<string, string>;
  description: string;
  photoUrl: string | null;
  photoName: string | null;
  isActive: boolean;
}

export type GymCoachInput = Omit<GymCoach, "id">;

export interface CoachSchedule {
  [key: string]: string;
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
  monday: "",
  tuesday: "",
  wednesday: "",
  thursday: "",
  friday: "",
  saturday: "",
  sunday: "",
};

function mapCoach(value: unknown): GymCoach {
  const raw = asRecord(value);
  return {
    id: String(raw.id ?? ""),
    name: String(raw.name || ""),
    specialty: String(raw.specialty || ""),
    sessionPrice: Number(raw.sessionPrice) || 0,
    schedule:
      raw.schedule && typeof raw.schedule === "object"
        ? { ...asRecord(raw.schedule) } as Record<string, string>
        : {},
    description: String(raw.description || ""),
    photoUrl: raw.photoUrl == null ? null : String(raw.photoUrl),
    photoName: raw.photoName == null ? null : String(raw.photoName),
    isActive: raw.isActive !== false,
  };
}

interface OwnerCoachesState {
  coaches: GymCoach[];
  loading: boolean;
  fetchCoaches: () => Promise<void>;
  addCoach: (coach: GymCoachInput) => Promise<void>;
  updateCoach: (id: string, coach: GymCoachInput) => Promise<void>;
  setCoachActive: (id: string, isActive: boolean) => Promise<void>;
  removeCoach: (id: string) => Promise<void>;
  applyRealtimeCoaches: (coaches: unknown[]) => void;
}

export const useOwnerCoachesStore = create<OwnerCoachesState>((set, get) => ({
  coaches: [],
  loading: false,

  fetchCoaches: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get("/owner/coaches");
      if (data.success) {
        set({
          coaches: (data.data || []).map(mapCoach),
          loading: false,
        });
        return;
      }
      set({ coaches: [], loading: false });
    } catch (error) {
      console.error("Failed to fetch coaches:", error);
      set({ coaches: [], loading: false });
    }
  },

  applyRealtimeCoaches: (coaches) => {
    if (!Array.isArray(coaches)) return;
    set({ coaches: coaches.map(mapCoach) });
  },

  addCoach: async (coach) => {
    try {
      const { data } = await api.post("/owner/coaches", {
        ...coach,
        isActive: coach.isActive !== false,
      });
      if (data.success) {
        set({ coaches: [...get().coaches, mapCoach(data.data)] });
      }
    } catch (error) {
      console.error("Failed to add coach:", error);
    }
  },

  updateCoach: async (id, coach) => {
    try {
      const { data } = await api.put(`/owner/coaches/${id}`, coach);
      if (data.success) {
        set({
          coaches: get().coaches.map((c) => (c.id === id ? mapCoach(data.data) : c)),
        });
      }
    } catch (error) {
      console.error("Failed to update coach:", error);
    }
  },

  setCoachActive: async (id, isActive) => {
    const current = get().coaches.find((c) => c.id === id);
    if (!current) return;

    // Optimistic UI
    set({
      coaches: get().coaches.map((c) => (c.id === id ? { ...c, isActive } : c)),
    });

    try {
      const { data } = await api.put(`/owner/coaches/${id}`, {
        ...current,
        isActive,
      });
      if (data.success) {
        set({
          coaches: get().coaches.map((c) => (c.id === id ? mapCoach(data.data) : c)),
        });
        return;
      }
    } catch (error) {
      console.error("Failed to update coach status:", error);
    }

    // Revert on failure
    set({
      coaches: get().coaches.map((c) =>
        c.id === id ? { ...c, isActive: current.isActive } : c,
      ),
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
}));

export function getCoachInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

export function formatSessionPrice(price: number) {
  return `₱${price.toLocaleString()}/session`;
}

export function getCoachStatusStyles(isActive: boolean) {
  return isActive
    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
    : "border-zinc-500/30 bg-zinc-500/10 text-zinc-400";
}

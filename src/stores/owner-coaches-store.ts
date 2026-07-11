"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface CoachSchedule {
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
  saturday: string;
  sunday: string;
}

export interface GymCoach {
  id: string;
  name: string;
  specialty: string;
  sessionPrice: number;
  schedule: CoachSchedule;
  description: string;
  photoUrl: string | null;
  photoName: string | null;
}

export type GymCoachInput = Omit<GymCoach, "id">;

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

const DEFAULT_COACHES: GymCoach[] = [
  {
    id: "coach-1",
    name: "Marcus Johnson",
    specialty: "Powerlifting",
    sessionPrice: 1500,
    description:
      "Certified strength coach with 8 years of competition experience. Specializes in squat, bench, and deadlift technique.",
    photoUrl:
      "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=400&q=80",
    photoName: null,
    schedule: {
      monday: "6AM - 2PM",
      tuesday: "6AM - 2PM",
      wednesday: "6AM - 2PM",
      thursday: "6AM - 2PM",
      friday: "6AM - 2PM",
      saturday: "8AM - 12PM",
      sunday: "Off",
    },
  },
  {
    id: "coach-2",
    name: "Elena Cruz",
    specialty: "Yoga & Mobility",
    sessionPrice: 1200,
    description:
      "Helps members improve flexibility, recovery, and mindful movement through personalized mobility sessions.",
    photoUrl:
      "https://images.unsplash.com/photo-1594381898411-846e7d193883?auto=format&fit=crop&w=400&q=80",
    photoName: null,
    schedule: {
      monday: "9AM - 5PM",
      tuesday: "9AM - 5PM",
      wednesday: "Off",
      thursday: "9AM - 5PM",
      friday: "9AM - 5PM",
      saturday: "10AM - 2PM",
      sunday: "Off",
    },
  },
];

interface OwnerCoachesState {
  coaches: GymCoach[];
  addCoach: (coach: GymCoachInput) => void;
  removeCoach: (id: string) => void;
}

export const useOwnerCoachesStore = create<OwnerCoachesState>()(
  persist(
    (set, get) => ({
      coaches: DEFAULT_COACHES,

      addCoach: (coach) => {
        set({
          coaches: [
            ...get().coaches,
            {
              id: `coach-${Date.now()}`,
              name: coach.name.trim(),
              specialty: coach.specialty.trim(),
              sessionPrice: coach.sessionPrice,
              schedule: coach.schedule,
              description: coach.description.trim(),
              photoUrl: coach.photoUrl,
              photoName: coach.photoName,
            },
          ],
        });
      },

      removeCoach: (id) => {
        set({ coaches: get().coaches.filter((coach) => coach.id !== id) });
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

"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export const MEMBERSHIP_GROWTH = [
  { month: "Jan", value: 30 },
  { month: "Feb", value: 33 },
  { month: "Mar", value: 36 },
  { month: "Apr", value: 39 },
  { month: "May", value: 42 },
  { month: "Jun", value: 45 },
] as const;

export const MOST_ACTIVE_GYMS = [
  { name: "Powerhouse", members: 342 },
  { name: "Elite Fitness", members: 278 },
  { name: "Ironworks", members: 214 },
  { name: "Abbsy Mini", members: 142 },
  { name: "Golds Gym", members: 110 },
] as const;

const DEFAULT_METRICS = {
  totalUsers: 12450,
  gymOwners: 142,
  totalMembers: 8920,
  activeSubscriptions: 7150,
  monthlyRevenue: 45200,
};

interface AdminAnalyticsState {
  metrics: typeof DEFAULT_METRICS;
}

export const useAdminAnalyticsStore = create<AdminAnalyticsState>()(
  persist(
    () => ({
      metrics: DEFAULT_METRICS,
    }),
    {
      name: "fitfinder-admin-analytics",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

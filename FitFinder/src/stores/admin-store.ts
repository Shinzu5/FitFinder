"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type ActivityTone = "success" | "info" | "warning";

export interface AdminActivity {
  id: string;
  message: string;
  tone: ActivityTone;
  createdAt: number;
}

const REVENUE_BY_MONTH = [
  { month: "Jan", value: 22 },
  { month: "Feb", value: 28 },
  { month: "Mar", value: 34 },
  { month: "Apr", value: 38 },
  { month: "May", value: 42 },
  { month: "Jun", value: 45.2 },
] as const;

function hoursAgo(hours: number) {
  return Date.now() - hours * 60 * 60 * 1000;
}

function minutesAgo(minutes: number) {
  return Date.now() - minutes * 60 * 1000;
}

const DEFAULT_ACTIVITY: AdminActivity[] = [
  {
    id: "act-1",
    message: "Powerhouse Fitness approved",
    tone: "success",
    createdAt: minutesAgo(2),
  },
  {
    id: "act-2",
    message: "New transaction $1,200",
    tone: "info",
    createdAt: minutesAgo(15),
  },
  {
    id: "act-3",
    message: "Elite Fitness Cebu updated profile",
    tone: "info",
    createdAt: hoursAgo(1),
  },
  {
    id: "act-4",
    message: "New gym application: Davao Strength",
    tone: "warning",
    createdAt: hoursAgo(3),
  },
  {
    id: "act-5",
    message: "System backup completed",
    tone: "success",
    createdAt: hoursAgo(5),
  },
];

export function formatActivityTime(timestamp: number) {
  const diffMs = Date.now() - timestamp;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  if (diffMins < 60) return `${Math.max(1, diffMins)} mins ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}

interface AdminState {
  totalUsersBase: number;
  platformRevenue: number;
  activity: AdminActivity[];
  addActivity: (message: string, tone: ActivityTone) => void;
  getRevenueTrend: () => typeof REVENUE_BY_MONTH;
}

export const useAdminStore = create<AdminState>()(
  persist(
    (set, get) => ({
      totalUsersBase: 12450,
      platformRevenue: 45200,
      activity: DEFAULT_ACTIVITY,

      addActivity: (message, tone) => {
        const entry: AdminActivity = {
          id: `act-${Date.now()}`,
          message,
          tone,
          createdAt: Date.now(),
        };
        set({ activity: [entry, ...get().activity].slice(0, 12) });
      },

      getRevenueTrend: () => REVENUE_BY_MONTH,
    }),
    {
      name: "fitfinder-admin",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

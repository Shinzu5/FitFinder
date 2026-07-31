"use client";

import { create } from "zustand";
import api from "@/lib/api";

export type ActivityTone = "success" | "info" | "warning";

export interface AdminActivity {
  id: string;
  message: string;
  tone: ActivityTone;
  createdAt: number;
}

export interface RevenuePoint {
  month: string;
  value: number;
}

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
  totalUsers: number;
  totalGyms: number;
  platformRevenue: number;
  revenueStats: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    total: number;
  };
  activity: AdminActivity[];
  revenueTrend: RevenuePoint[];
  loading: boolean;
  error: string | null;
  fetchDashboard: () => Promise<void>;
  addActivity: (message: string, tone: ActivityTone) => void;
  getRevenueTrend: () => RevenuePoint[];
}

function mapTone(tone: string): ActivityTone {
  const t = String(tone || "info").toLowerCase();
  if (t === "success") return "success";
  if (t === "warning") return "warning";
  return "info";
}

export const useAdminStore = create<AdminState>((set, get) => ({
  totalUsers: 0,
  totalGyms: 0,
  platformRevenue: 0,
  revenueStats: { today: 0, thisWeek: 0, thisMonth: 0, total: 0 },
  activity: [],
  revenueTrend: [],
  loading: false,
  error: null,

  fetchDashboard: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.get("/admin/dashboard");
      if (!data.success) {
        set({ loading: false, error: data.message || "Failed to load dashboard." });
        return;
      }

      const activity = (data.data.activity || []).map((a: any) => ({
        id: a.id,
        message: a.message,
        tone: mapTone(a.tone),
        createdAt: a.createdAt ? new Date(a.createdAt).getTime() : Date.now(),
      }));

      const stats = data.data.revenueStats || {
        today: 0,
        thisWeek: 0,
        thisMonth: 0,
        total: data.data.platformRevenue || 0,
      };

      // Build a simple trend from available revenue buckets (DB-derived, not hardcoded demo)
      const revenueTrend: RevenuePoint[] = [
        { month: "Today", value: Number(stats.today) || 0 },
        { month: "Week", value: Number(stats.thisWeek) || 0 },
        { month: "Month", value: Number(stats.thisMonth) || 0 },
        { month: "Total", value: Number(stats.total) || 0 },
      ];

      set({
        totalUsers: data.data.totalUsers ?? 0,
        totalGyms: data.data.totalGyms ?? 0,
        platformRevenue: data.data.platformRevenue ?? 0,
        revenueStats: stats,
        activity,
        revenueTrend,
        loading: false,
        error: null,
      });
    } catch (error: any) {
      set({
        loading: false,
        error: error.response?.data?.message || "Failed to load dashboard.",
      });
    }
  },

  addActivity: (message, tone) => {
    // Optimistic local feed entry; server activities come from AdminActivity table on refresh
    const entry: AdminActivity = {
      id: `act-${Date.now()}`,
      message,
      tone,
      createdAt: Date.now(),
    };
    set({ activity: [entry, ...get().activity].slice(0, 12) });
  },

  getRevenueTrend: () => get().revenueTrend,
}));

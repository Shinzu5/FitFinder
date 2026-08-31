"use client";

import { create } from "zustand";
import api from "@/lib/api";

export type ActivityTone = "success" | "info" | "warning";
export type RevenuePeriod = "today" | "week" | "month" | "year";

export interface AdminActivity {
  id: string;
  message: string;
  tone: ActivityTone;
  createdAt: number;
}

export interface RevenuePoint {
  label: string;
  value: number;
}

export interface RevenueChartSeries {
  today: RevenuePoint[];
  week: RevenuePoint[];
  month: RevenuePoint[];
  year: RevenuePoint[];
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
  activeGyms: number;
  activeSubscriptions: number;
  platformRevenue: number;
  revenueStats: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    total: number;
  };
  revenueChart: RevenueChartSeries;
  chartPeriod: RevenuePeriod;
  activity: AdminActivity[];
  loading: boolean;
  error: string | null;
  fetchDashboard: (opts?: { silent?: boolean }) => Promise<void>;
  setChartPeriod: (period: RevenuePeriod) => void;
  addActivity: (message: string, tone: ActivityTone) => void;
  getRevenueTrend: () => RevenuePoint[];
}

function mapTone(tone: string): ActivityTone {
  const t = String(tone || "info").toLowerCase();
  if (t === "success") return "success";
  if (t === "warning") return "warning";
  return "info";
}

const EMPTY_CHART: RevenueChartSeries = {
  today: [],
  week: [],
  month: [],
  year: [],
};

function mapSeries(raw: unknown): RevenuePoint[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((p: { label?: string; month?: string; value?: number }) => ({
    label: String(p.label ?? p.month ?? ""),
    value: Number(p.value) || 0,
  }));
}

export const useAdminStore = create<AdminState>((set, get) => ({
  totalUsers: 0,
  totalGyms: 0,
  activeGyms: 0,
  activeSubscriptions: 0,
  platformRevenue: 0,
  revenueStats: { today: 0, thisWeek: 0, thisMonth: 0, total: 0 },
  revenueChart: EMPTY_CHART,
  chartPeriod: "month",
  activity: [],
  loading: false,
  error: null,

  fetchDashboard: async (opts) => {
    const silent = Boolean(opts?.silent);
    if (!silent) set({ loading: true, error: null });
    try {
      const { data } = await api.get("/admin/dashboard");
      if (!data.success) {
        set({ loading: false, error: data.message || "Failed to load dashboard." });
        return;
      }

      const activity = (data.data.activity || []).map(
        (a: { id: string; message: string; tone: string; createdAt?: string }) => ({
          id: a.id,
          message: a.message,
          tone: mapTone(a.tone),
          createdAt: a.createdAt ? new Date(a.createdAt).getTime() : Date.now(),
        }),
      );

      const stats = data.data.revenueStats || {
        today: 0,
        thisWeek: 0,
        thisMonth: 0,
        total: data.data.platformRevenue || 0,
      };

      const chartRaw = data.data.revenueChart || {};
      const revenueChart: RevenueChartSeries = {
        today: mapSeries(chartRaw.today),
        week: mapSeries(chartRaw.week),
        month: mapSeries(chartRaw.month),
        year: mapSeries(chartRaw.year),
      };

      set({
        totalUsers: data.data.totalUsers ?? 0,
        totalGyms: data.data.totalGyms ?? 0,
        activeGyms: data.data.activeGyms ?? data.data.totalGyms ?? 0,
        activeSubscriptions: data.data.activeSubscriptions ?? 0,
        platformRevenue: data.data.platformRevenue ?? 0,
        revenueStats: stats,
        revenueChart,
        activity,
        loading: false,
        error: null,
      });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      set({
        loading: false,
        error: err.response?.data?.message || "Failed to load dashboard.",
      });
    }
  },

  setChartPeriod: (period) => set({ chartPeriod: period }),

  addActivity: (message, tone) => {
    const entry: AdminActivity = {
      id: `act-${Date.now()}`,
      message,
      tone,
      createdAt: Date.now(),
    };
    set({ activity: [entry, ...get().activity].slice(0, 20) });
  },

  getRevenueTrend: () => {
    const { revenueChart, chartPeriod } = get();
    return revenueChart[chartPeriod] || [];
  },
}));

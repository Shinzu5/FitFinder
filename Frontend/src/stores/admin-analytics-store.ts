"use client";

import { create } from "zustand";
import api from "@/lib/api";

export interface AnalyticsMetrics {
  totalUsers: number;
  totalOwners: number;
  totalGyms: number;
  activeMembers: number;
  activeSubscriptions: number;
  platformRevenue: number;
  monthRevenue: number;
  newUsersThisMonth: number;
  newGymsThisMonth: number;
  userGrowthPct: number;
  revenueGrowthPct: number;
}

export interface ChartPoint {
  label: string;
  value: number;
}

export interface TopGym {
  id: string;
  name: string;
  location: string;
  imageUrl: string;
  members: number;
}

interface AdminAnalyticsState {
  metrics: AnalyticsMetrics;
  membershipGrowth: ChartPoint[];
  topGyms: TopGym[];
  loading: boolean;
  error: string | null;
  fetchAnalytics: (opts?: { silent?: boolean }) => Promise<void>;
}

const EMPTY_METRICS: AnalyticsMetrics = {
  totalUsers: 0,
  totalOwners: 0,
  totalGyms: 0,
  activeMembers: 0,
  activeSubscriptions: 0,
  platformRevenue: 0,
  monthRevenue: 0,
  newUsersThisMonth: 0,
  newGymsThisMonth: 0,
  userGrowthPct: 0,
  revenueGrowthPct: 0,
};

export const useAdminAnalyticsStore = create<AdminAnalyticsState>((set) => ({
  metrics: EMPTY_METRICS,
  membershipGrowth: [],
  topGyms: [],
  loading: false,
  error: null,

  fetchAnalytics: async (opts) => {
    const silent = Boolean(opts?.silent);
    if (!silent) set({ loading: true, error: null });
    try {
      const { data } = await api.get("/admin/analytics");
      if (!data.success) {
        set({ loading: false, error: data.message || "Failed to load analytics." });
        return;
      }

      const m = data.data.metrics || {};
      set({
        metrics: {
          totalUsers: m.totalUsers ?? 0,
          totalOwners: m.totalOwners ?? 0,
          totalGyms: m.totalGyms ?? 0,
          activeMembers: m.activeMembers ?? 0,
          activeSubscriptions: m.activeSubscriptions ?? 0,
          platformRevenue: m.platformRevenue ?? 0,
          monthRevenue: m.monthRevenue ?? 0,
          newUsersThisMonth: m.newUsersThisMonth ?? 0,
          newGymsThisMonth: m.newGymsThisMonth ?? 0,
          userGrowthPct: m.userGrowthPct ?? 0,
          revenueGrowthPct: m.revenueGrowthPct ?? 0,
        },
        membershipGrowth: Array.isArray(data.data.membershipGrowth)
          ? data.data.membershipGrowth.map((p: { label?: string; value?: number }) => ({
              label: String(p.label || ""),
              value: Number(p.value) || 0,
            }))
          : [],
        topGyms: Array.isArray(data.data.topGyms)
          ? data.data.topGyms.map(
              (g: {
                id: string;
                name: string;
                location?: string;
                imageUrl?: string;
                members?: number;
              }) => ({
                id: g.id,
                name: g.name,
                location: g.location || "",
                imageUrl: g.imageUrl || "",
                members: g.members ?? 0,
              }),
            )
          : [],
        loading: false,
        error: null,
      });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      set({
        loading: false,
        error: err.response?.data?.message || "Failed to load analytics.",
      });
    }
  },
}));

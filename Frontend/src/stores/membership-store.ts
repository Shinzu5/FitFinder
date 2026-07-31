"use client";

import { create } from "zustand";
import api from "@/lib/api";
import type { CompletedMembership, JoinPaymentMethod } from "./join-gym-store";

export interface RenewalHistoryItem {
  id: string;
  planName: string;
  planPrice: number;
  durationDays: number;
  totalPaid: number;
  paymentMethod: string;
  renewalDate: string;
}

interface MembershipState {
  joinedGymId: string | null;
  membership: CompletedMembership | null;
  renewalHistory: RenewalHistoryItem[];
  loading: boolean;
  error: string | null;
  fetchMembership: () => Promise<void>;
  joinGym: (details: CompletedMembership) => Promise<boolean>;
  leaveGym: () => Promise<void>;
}

function mapMembership(data: any): CompletedMembership {
  return {
    gymId: data.gymId,
    gymName: data.gymName,
    planId: data.planId,
    planName: data.planName,
    planPrice: data.planPrice,
    coachId: data.coachId ?? null,
    coachName: data.coachName ?? null,
    coachSessionPrice: data.coachSessionPrice ?? 0,
    paymentMethod: (String(data.paymentMethod || "cashless").toLowerCase() === "cash" ||
    String(data.paymentMethod || "").toLowerCase() === "walk-in"
      ? String(data.paymentMethod).toLowerCase()
      : "cashless") as JoinPaymentMethod,
    paymentRef: data.paymentRef,
    totalPaid: data.totalPaid,
    joinedAt: data.joinedAt,
    expiresAt: data.expiresAt,
    durationDays: data.durationDays,
  };
}

function mapRenewalHistory(raw: unknown): RenewalHistoryItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item: any) => ({
    id: String(item.id),
    planName: String(item.planName || "Plan"),
    planPrice: Number(item.planPrice) || 0,
    durationDays: Number(item.durationDays) || 0,
    totalPaid: Number(item.totalPaid) || 0,
    paymentMethod: String(item.paymentMethod || "Walk-in"),
    renewalDate: String(item.renewalDate || ""),
  }));
}

function isMembershipExpired(membership: CompletedMembership): boolean {
  if (!membership.expiresAt) return false;
  return new Date(membership.expiresAt).getTime() <= Date.now();
}

export const useMembershipStore = create<MembershipState>((set) => ({
  joinedGymId: null,
  membership: null,
  renewalHistory: [],
  loading: false,
  error: null,

  fetchMembership: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.get("/user/membership");
      if (!data.success || !data.data) {
        set({ joinedGymId: null, membership: null, renewalHistory: [], loading: false });
        return;
      }

      const membership = mapMembership(data.data);
      if (isMembershipExpired(membership)) {
        set({
          joinedGymId: null,
          membership: null,
          renewalHistory: [],
          loading: false,
          error: null,
        });
        return;
      }

      set({
        joinedGymId: membership.gymId,
        membership,
        renewalHistory: mapRenewalHistory(data.data.renewalHistory),
        loading: false,
        error: null,
      });
    } catch (error: any) {
      set({
        loading: false,
        error: error.response?.data?.message || "Failed to load membership.",
      });
    }
  },

  joinGym: async (details) => {
    try {
      const { data } = await api.post("/user/join-gym", {
        gymId: details.gymId,
        planId: details.planId,
        coachId: details.coachId,
        paymentMethod: details.paymentMethod,
        paymentRef: details.paymentRef,
        totalPaid: details.totalPaid,
      });

      if (!data.success) {
        set({ error: data.message || "Failed to join gym." });
        return false;
      }

      // Walk-in / renewal creates an approval, not an immediate date change
      if (details.paymentMethod === "walk-in") {
        set({ error: null });
        return true;
      }

      const membership = data.data?.membership
        ? mapMembership({
            ...data.data.membership,
            gymName: details.gymName,
            planName: details.planName,
            planPrice: details.planPrice,
            coachName: details.coachName,
            coachSessionPrice: details.coachSessionPrice,
            durationDays: details.durationDays,
          })
        : details;

      set({
        joinedGymId: membership.gymId,
        membership,
        error: null,
      });
      return true;
    } catch (error: any) {
      set({ error: error.response?.data?.message || "Failed to join gym." });
      return false;
    }
  },

  leaveGym: async () => {
    try {
      await api.delete("/user/membership");
    } catch {
      // Still clear local state if already gone server-side
    }
    set({ joinedGymId: null, membership: null, renewalHistory: [], error: null });
  },
}));

export type { JoinPaymentMethod };

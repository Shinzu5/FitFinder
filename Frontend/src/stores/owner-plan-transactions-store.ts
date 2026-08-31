"use client";

import { create } from "zustand";
import api from "@/lib/api";
import type { OwnerPlanId } from "@/lib/owner-plans";
import { getOwnerPlan } from "@/lib/owner-plans";

export type OwnerPlanPaymentMethod = "Xendit";

export interface OwnerPlanTransaction {
  id: string;
  gymName: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  planId: OwnerPlanId | string;
  planName: string;
  type: "Owner Plan";
  amount: number;
  method: OwnerPlanPaymentMethod | string;
  referenceNo: string;
  createdAt: string;
  validUntil?: string;
  daysLeft?: number;
  months?: number;
}

interface OwnerPlanTransactionsState {
  transactions: OwnerPlanTransaction[];
  stats: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    total: number;
  };
  loading: boolean;
  error: string | null;
  fetchTransactions: () => Promise<void>;
  recordPlanPurchase: (input: {
    ownerId: string;
    ownerName: string;
    ownerEmail: string;
    planId: OwnerPlanId;
    referenceNo: string;
    gymName?: string;
    createdAt?: string;
  }) => void;
  attachGymToLatestPurchase: (input: {
    ownerId: string;
    referenceNo: string;
    gymName: string;
  }) => void;
  getStats: () => {
    today: number;
    thisWeek: number;
    thisMonth: number;
    total: number;
  };
}

const EMPTY_STATS = { today: 0, thisWeek: 0, thisMonth: 0, total: 0 };

export const useOwnerPlanTransactionsStore = create<OwnerPlanTransactionsState>((set, get) => ({
  transactions: [],
  stats: EMPTY_STATS,
  loading: false,
  error: null,

  fetchTransactions: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.get("/admin/transactions");
      if (!data.success) {
        set({ loading: false, error: data.message || "Failed to load transactions." });
        return;
      }

      // Support both new { transactions, stats } and legacy array payloads
      const payload = data.data;
      const list = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.transactions)
          ? payload.transactions
          : [];

      const transactions: OwnerPlanTransaction[] = list.map((txn: any) => ({
        id: txn.id,
        gymName: txn.gymName || "Pending setup",
        ownerId: txn.ownerId,
        ownerName: txn.ownerName || "Owner",
        ownerEmail: txn.ownerEmail || "",
        planId: txn.planId || "standard",
        planName: txn.planName || "Plan",
        type: "Owner Plan" as const,
        amount: Number(txn.amount) || 0,
        method: txn.method || "Xendit",
        referenceNo: txn.referenceNo || "",
        createdAt: txn.createdAt,
        validUntil: txn.validUntil,
        daysLeft: typeof txn.daysLeft === "number" ? txn.daysLeft : undefined,
        months: typeof txn.months === "number" ? txn.months : undefined,
      }));

      const stats = !Array.isArray(payload) && payload?.stats
        ? {
            today: Number(payload.stats.today) || 0,
            thisWeek: Number(payload.stats.thisWeek) || 0,
            thisMonth: Number(payload.stats.thisMonth) || 0,
            total: Number(payload.stats.total) || 0,
          }
        : EMPTY_STATS;

      set({ transactions, stats, loading: false, error: null });
    } catch (error: any) {
      set({
        loading: false,
        error: error.response?.data?.message || "Failed to load transactions.",
      });
    }
  },

  recordPlanPurchase: (input) => {
    const plan = getOwnerPlan(input.planId);
    const txn: OwnerPlanTransaction = {
      id: `local-${Date.now()}`,
      gymName: input.gymName ?? "Pending setup",
      ownerId: input.ownerId,
      ownerName: input.ownerName,
      ownerEmail: input.ownerEmail,
      planId: input.planId,
      planName: plan.name,
      type: "Owner Plan",
      amount: plan.price,
      method: "Xendit",
      referenceNo: input.referenceNo,
      createdAt: input.createdAt ?? new Date().toISOString(),
    };
    const stats = get().stats;
    set({
      transactions: [txn, ...get().transactions],
      stats: {
        today: stats.today + plan.price,
        thisWeek: stats.thisWeek + plan.price,
        thisMonth: stats.thisMonth + plan.price,
        total: stats.total + plan.price,
      },
    });
  },

  attachGymToLatestPurchase: ({ ownerId, referenceNo, gymName }) => {
    set({
      transactions: get().transactions.map((txn) =>
        txn.ownerId === ownerId && txn.referenceNo === referenceNo
          ? { ...txn, gymName }
          : txn,
      ),
    });
  },

  getStats: () => get().stats,
}));

export function formatOwnerPlanTransactionDate(isoDate: string) {
  return new Date(isoDate).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatPesoAmount(amount: number, compact = false) {
  if (compact && amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (compact && amount >= 100_000) {
    return `${Math.round(amount / 1_000)}K`;
  }
  return amount.toLocaleString("en-PH");
}

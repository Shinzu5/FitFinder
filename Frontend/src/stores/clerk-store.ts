"use client";

import { create } from "zustand";
import api from "@/lib/api";

export type PaymentMethod = "cash" | "cashless";
export type TransactionType = "monthly" | "session" | "supplements" | "day-pass" | "renewal" | "coach";
export type MemberStatus = "active" | "expiring" | "expired";

export interface ClerkTransaction {
  id: string;
  type: TransactionType;
  member: string;
  amount: number;
  method: PaymentMethod;
  notes: string;
  createdAt: number;
}

export interface ClerkMember {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  plan: string;
  planPrice: number;
  status: MemberStatus;
  joinedAt: number;
  expiresAt: number;
  remainingDays: number;
}

export interface MembershipPlanOption {
  id: string;
  label: string;
  price: number;
  durationDays: number;
}

export interface WalkInPaymentOption {
  id: string;
  label: string;
  defaultAmount: number;
  transactionType: TransactionType;
}

/** UI catalog for walk-in payment categories (not demo rows). */
export const WALK_IN_PAYMENT_OPTIONS: WalkInPaymentOption[] = [
  { id: "day-pass", label: "Day Pass", defaultAmount: 150, transactionType: "day-pass" },
  { id: "renewal", label: "Membership Renewal", defaultAmount: 1500, transactionType: "renewal" },
  { id: "supplements", label: "Supplement Purchase", defaultAmount: 1200, transactionType: "supplements" },
  { id: "coach", label: "Coach Session", defaultAmount: 600, transactionType: "coach" },
];

export function formatTransactionTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function getTransactionTypeLabel(type: TransactionType) {
  const labels: Record<TransactionType, string> = {
    monthly: "monthly",
    session: "session",
    supplements: "supplements",
    "day-pass": "day pass",
    renewal: "renewal",
    coach: "coach",
  };
  return labels[type];
}

export function getTransactionDisplayLabel(type: TransactionType) {
  const option = WALK_IN_PAYMENT_OPTIONS.find((item) => item.transactionType === type);
  if (option) return option.label;
  const labels: Record<TransactionType, string> = {
    monthly: "Monthly Membership",
    session: "Coach Session",
    supplements: "Supplement Purchase",
    "day-pass": "Day Pass",
    renewal: "Membership Renewal",
    coach: "Coach Session",
  };
  return labels[type];
}

export function getPaymentMethodLabel(method: PaymentMethod) {
  return method === "cash" ? "Cash" : "Cashless";
}

interface RecordPaymentInput {
  type: TransactionType;
  member: string;
  amount: number;
  method: PaymentMethod;
  notes: string;
}

interface RegisterMemberInput {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  planId: string;
}

interface ClerkState {
  gymName: string;
  transactions: ClerkTransaction[];
  members: ClerkMember[];
  plans: MembershipPlanOption[];
  walkInsToday: number;
  revenueToday: number;
  newMembersToday: number;
  activeNow: number;
  loading: boolean;
  error: string | null;
  fetchDashboard: () => Promise<void>;
  fetchTransactions: () => Promise<void>;
  fetchMembers: () => Promise<void>;
  fetchPlans: () => Promise<void>;
  fetchAll: () => Promise<void>;
  recordPayment: (input: RecordPaymentInput) => Promise<boolean>;
  registerMember: (input: RegisterMemberInput) => Promise<ClerkMember | null>;
  fetchClosingPreview: () => Promise<{
    date: string;
    totalTransactions: number;
    totalRevenue: number;
    canClose: boolean;
    message: string;
  } | null>;
  closeDailySales: () => Promise<boolean>;
}

export const useClerkStore = create<ClerkState>((set, get) => ({
  gymName: "",
  transactions: [],
  members: [],
  plans: [],
  walkInsToday: 0,
  revenueToday: 0,
  newMembersToday: 0,
  activeNow: 0,
  loading: false,
  error: null,

  fetchDashboard: async () => {
    try {
      const { data } = await api.get("/clerk/dashboard");
      if (!data.success) return;
      set({
        gymName: data.data.gymName || "",
        walkInsToday: data.data.walkInsToday ?? 0,
        revenueToday: data.data.revenueToday ?? 0,
        newMembersToday: data.data.newMembersToday ?? 0,
        activeNow: data.data.activeNow ?? 0,
        error: null,
      });
    } catch (error: any) {
      set({ error: error.response?.data?.message || "Failed to load dashboard." });
    }
  },

  fetchTransactions: async () => {
    try {
      const { data } = await api.get("/clerk/transactions");
      if (!data.success) return;
      set({
        transactions: (data.data || []) as ClerkTransaction[],
        error: null,
      });
    } catch (error: any) {
      set({ error: error.response?.data?.message || "Failed to load transactions." });
    }
  },

  fetchMembers: async () => {
    try {
      const { data } = await api.get("/clerk/members");
      if (!data.success) return;
      const members = (data.data || []).map((m: any) => ({
        id: m.id,
        firstName: m.firstName || "",
        lastName: m.lastName || "",
        email: m.email,
        plan: m.plan,
        planPrice: m.planPrice,
        status: (m.status || "active") as MemberStatus,
        joinedAt: typeof m.joinedAt === "number" ? m.joinedAt : new Date(m.joinedAt).getTime(),
        expiresAt:
          typeof m.expiresAt === "number"
            ? m.expiresAt
            : m.expiresAt
              ? new Date(m.expiresAt).getTime()
              : 0,
        remainingDays:
          typeof m.remainingDays === "number"
            ? m.remainingDays
            : 0,
      }));
      set({ members, error: null });
    } catch (error: any) {
      set({ error: error.response?.data?.message || "Failed to load members." });
    }
  },

  fetchPlans: async () => {
    try {
      const { data } = await api.get("/clerk/plans");
      if (!data.success) return;
      set({ plans: (data.data || []) as MembershipPlanOption[], error: null });
    } catch (error: any) {
      set({ error: error.response?.data?.message || "Failed to load plans." });
    }
  },

  fetchAll: async () => {
    set({ loading: true, error: null });
    await Promise.all([
      get().fetchDashboard(),
      get().fetchTransactions(),
      get().fetchMembers(),
      get().fetchPlans(),
    ]);
    set({ loading: false });
  },

  recordPayment: async (input) => {
    try {
      const { data } = await api.post("/clerk/transactions", {
        type: input.type,
        member: input.member.trim() || "Guest",
        amount: input.amount,
        method: input.method,
        notes: input.notes.trim(),
      });

      if (!data.success) {
        set({ error: data.message || "Failed to record payment." });
        return false;
      }

      const txn = data.data as ClerkTransaction;
      set({
        transactions: [txn, ...get().transactions],
        walkInsToday: get().walkInsToday + 1,
        revenueToday: get().revenueToday + txn.amount,
        error: null,
      });
      return true;
    } catch (error: any) {
      set({ error: error.response?.data?.message || "Failed to record payment." });
      return false;
    }
  },

  registerMember: async (input) => {
    try {
      const { data } = await api.post("/clerk/members", {
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        phone: input.phone.trim(),
        email: input.email?.trim() || undefined,
        planId: input.planId,
      });

      if (!data.success) {
        set({ error: data.message || "Failed to register member." });
        return null;
      }

      await Promise.all([get().fetchMembers(), get().fetchTransactions(), get().fetchDashboard()]);

      const plan = get().plans.find((p) => p.id === input.planId);
      return {
        id: data.data.id,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        email: input.email?.trim() || undefined,
        plan: plan?.label || "Plan",
        planPrice: plan?.price || 0,
        status: "active" as MemberStatus,
        joinedAt: Date.now(),
        expiresAt: Date.now() + (plan?.durationDays || 30) * 24 * 60 * 60 * 1000,
        remainingDays: plan?.durationDays || 30,
      };
    } catch (error: any) {
      set({ error: error.response?.data?.message || "Failed to register member." });
      return null;
    }
  },

  fetchClosingPreview: async () => {
    try {
      const { data } = await api.get("/clerk/sales/closing-preview");
      if (!data.success) {
        set({ error: data.message || "Failed to load closing preview." });
        return null;
      }
      return {
        date: data.data.date,
        totalTransactions: data.data.totalTransactions ?? 0,
        totalRevenue: data.data.totalRevenue ?? 0,
        canClose: Boolean(data.data.canClose),
        message: data.data.message || "",
      };
    } catch (error: any) {
      set({ error: error.response?.data?.message || "Failed to load closing preview." });
      return null;
    }
  },

  closeDailySales: async () => {
    try {
      const { data } = await api.post("/clerk/sales/close");
      if (!data.success) {
        set({ error: data.message || "Failed to close daily sales." });
        return false;
      }

      // Reset running counter — open transactions are now linked to the report
      set({
        transactions: [],
        walkInsToday: 0,
        revenueToday: 0,
        error: null,
      });
      await Promise.all([get().fetchTransactions(), get().fetchDashboard()]);
      return true;
    } catch (error: any) {
      set({ error: error.response?.data?.message || "Failed to close daily sales." });
      return false;
    }
  },
}));

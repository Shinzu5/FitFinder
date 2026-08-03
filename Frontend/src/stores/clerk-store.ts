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
  fullName?: string;
  plan: string;
  planPrice: number;
  status: MemberStatus;
  joinedAt: number;
  expiresAt: number;
  startsAt?: number;
  remainingDays: number;
  memberType?: "Walk-in" | "Online";
  registeredBy?: "Owner" | "Clerk" | "Self";
  totalPaid?: number;
  registrationDate?: number;
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

/** Today's Log title = Notes value (DB), never hardcoded Day Pass / Monthly labels. */
export function getTodaysLogTitle(txn: { notes?: string | null }) {
  const notes = String(txn.notes || "").trim();
  return notes || "Walk-in Payment";
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

export interface RevenueMonthPoint {
  month: string;
  /** Chart axis value in ₱ thousands */
  value: number;
  /** Raw peso total for the month */
  total: number;
}

interface ClerkState {
  gymName: string;
  transactions: ClerkTransaction[];
  members: ClerkMember[];
  plans: MembershipPlanOption[];
  walkInsToday: number;
  revenueToday: number;
  monthlyRevenue: number;
  revenueByMonth: RevenueMonthPoint[];
  newMembersToday: number;
  activeNow: number;
  loading: boolean;
  error: string | null;
  fetchDashboard: () => Promise<void>;
  fetchTransactions: () => Promise<void>;
  fetchMembers: () => Promise<void>;
  fetchPlans: () => Promise<void>;
  setPlans: (plans: MembershipPlanOption[]) => void;
  fetchAll: () => Promise<void>;
  recordPayment: (input: RecordPaymentInput) => Promise<boolean>;
  updatePayment: (
    id: string,
    input: Partial<RecordPaymentInput>,
  ) => Promise<boolean>;
  deletePayment: (id: string) => Promise<boolean>;
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
  monthlyRevenue: 0,
  revenueByMonth: [],
  newMembersToday: 0,
  activeNow: 0,
  loading: false,
  error: null,

  fetchDashboard: async () => {
    try {
      const { data } = await api.get("/clerk/dashboard");
      if (!data.success) return;
      const months = Array.isArray(data.data.revenueByMonth)
        ? (data.data.revenueByMonth as RevenueMonthPoint[]).map((row) => ({
            month: String(row.month || ""),
            value: Number(row.value) || 0,
            total: Number(row.total) || 0,
          }))
        : [];
      set({
        gymName: data.data.gymName || "",
        walkInsToday: data.data.walkInsToday ?? 0,
        revenueToday: data.data.revenueToday ?? 0,
        monthlyRevenue: Number(data.data.monthlyRevenue) || 0,
        revenueByMonth: months,
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
      const members = (data.data || []).map((m: any) => {
        const joinedAt =
          typeof m.joinedAt === "number"
            ? m.joinedAt
            : m.joinedAt
              ? new Date(m.joinedAt).getTime()
              : 0;
        const expiresAt =
          typeof m.expiresAt === "number"
            ? m.expiresAt
            : m.expiresAt
              ? new Date(m.expiresAt).getTime()
              : 0;
        const startsAt =
          typeof m.startsAt === "number"
            ? m.startsAt
            : m.startsAt
              ? new Date(m.startsAt).getTime()
              : joinedAt;
        return {
          id: m.id,
          firstName: m.firstName || "",
          lastName: m.lastName || "",
          fullName: m.fullName || `${m.firstName || ""} ${m.lastName || ""}`.trim(),
          email: m.email,
          plan: m.plan || m.planName || "Plan",
          planPrice: Number(m.planPrice) || 0,
          status: (m.status || "active") as MemberStatus,
          joinedAt,
          expiresAt,
          startsAt,
          remainingDays: typeof m.remainingDays === "number" ? m.remainingDays : 0,
          memberType: m.memberType === "Online" ? "Online" : "Walk-in",
          registeredBy:
            m.registeredBy === "Owner" || m.registeredBy === "Clerk"
              ? m.registeredBy
              : "Self",
          totalPaid: Number(m.totalPaid) || 0,
          registrationDate: joinedAt,
        } as ClerkMember;
      });
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

  setPlans: (plans) => set({ plans, error: null }),

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
      // Immediate local Today's Log update; sales_updated keeps other clients in sync
      const withoutDup = get().transactions.filter((t) => t.id !== txn.id);
      set({
        transactions: [txn, ...withoutDup],
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

  updatePayment: async (id, input) => {
    try {
      const body: Record<string, unknown> = {};
      if (input.type !== undefined) body.type = input.type;
      if (input.member !== undefined) body.member = input.member.trim() || "Guest";
      if (input.amount !== undefined) body.amount = input.amount;
      if (input.method !== undefined) body.method = input.method;
      if (input.notes !== undefined) body.notes = input.notes.trim();

      const { data } = await api.put(`/clerk/transactions/${id}`, body);
      if (!data.success) {
        set({ error: data.message || "Failed to update payment." });
        return false;
      }

      const txn = data.data as ClerkTransaction;
      set({
        transactions: get().transactions.map((t) => (t.id === id ? txn : t)),
        error: null,
      });
      void get().fetchDashboard();
      return true;
    } catch (error: any) {
      set({ error: error.response?.data?.message || "Failed to update payment." });
      return false;
    }
  },

  deletePayment: async (id) => {
    try {
      const prev = get().transactions.find((t) => t.id === id);
      const { data } = await api.delete(`/clerk/transactions/${id}`);
      if (!data.success) {
        set({ error: data.message || "Failed to remove payment." });
        return false;
      }

      set({
        transactions: get().transactions.filter((t) => t.id !== id),
        walkInsToday: Math.max(0, get().walkInsToday - (prev ? 1 : 0)),
        revenueToday: Math.max(0, get().revenueToday - (prev?.amount || 0)),
        error: null,
      });
      return true;
    } catch (error: any) {
      set({ error: error.response?.data?.message || "Failed to remove payment." });
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

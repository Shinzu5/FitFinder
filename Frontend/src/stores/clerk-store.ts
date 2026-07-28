"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type PaymentMethod = "cash" | "cashless";
export type TransactionType = "monthly" | "session" | "supplements" | "day-pass" | "renewal" | "coach";
export type MemberStatus = "active" | "expiring";

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
  phone: string;
  email?: string;
  plan: string;
  planPrice: number;
  status: MemberStatus;
  joinedAt: number;
}

export interface WalkInPaymentOption {
  id: string;
  label: string;
  defaultAmount: number;
  transactionType: TransactionType;
}

export const CLERK_GYM_NAME = "Abbsy Mini Gym";

export const WALK_IN_PAYMENT_OPTIONS: WalkInPaymentOption[] = [
  { id: "day-pass", label: "Day Pass", defaultAmount: 150, transactionType: "day-pass" },
  { id: "renewal", label: "Membership Renewal", defaultAmount: 1500, transactionType: "renewal" },
  { id: "supplements", label: "Supplement Purchase", defaultAmount: 1200, transactionType: "supplements" },
  { id: "coach", label: "Coach Session", defaultAmount: 600, transactionType: "coach" },
];

export const MEMBERSHIP_PLANS = [
  { id: "monthly", label: "Monthly", price: 1500 },
  { id: "quarterly", label: "Quarterly", price: 4000 },
  { id: "yearly", label: "Yearly", price: 15000 },
] as const;

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function makeTimeStamp(hours: number, minutes: number) {
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d.getTime();
}

const DEFAULT_TRANSACTIONS: ClerkTransaction[] = [
  {
    id: "txn-1",
    type: "monthly",
    member: "Juan Dela Cruz",
    amount: 1500,
    method: "cash",
    notes: "Paid at front desk",
    createdAt: makeTimeStamp(8, 59),
  },
  {
    id: "txn-2",
    type: "session",
    member: "Maria Santos",
    amount: 600,
    method: "cashless",
    notes: "GCash transfer",
    createdAt: makeTimeStamp(9, 44),
  },
  {
    id: "txn-3",
    type: "supplements",
    member: "Guest",
    amount: 1200,
    method: "cash",
    notes: "Whey Protein 1lb",
    createdAt: makeTimeStamp(13, 30),
  },
];

const DEFAULT_MEMBERS: ClerkMember[] = [
  {
    id: "member-1",
    firstName: "Juan",
    lastName: "Dela Cruz",
    phone: "+63 917 123 4567",
    email: "juan@email.com",
    plan: "Monthly",
    planPrice: 1500,
    status: "active",
    joinedAt: makeTimeStamp(8, 0),
  },
  {
    id: "member-2",
    firstName: "Maria",
    lastName: "Santos",
    phone: "+63 918 234 5678",
    plan: "Monthly",
    planPrice: 1500,
    status: "active",
    joinedAt: makeTimeStamp(7, 30),
  },
  {
    id: "member-3",
    firstName: "Carlo",
    lastName: "Garcia",
    phone: "+63 919 345 6789",
    plan: "Quarterly",
    planPrice: 4000,
    status: "expiring",
    joinedAt: makeTimeStamp(6, 0) - 1000 * 60 * 60 * 24 * 80,
  },
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

interface AddMemberFromApprovalInput {
  firstName: string;
  lastName: string;
  email?: string;
  plan: string;
  planPrice: number;
}

interface ClerkState {
  transactions: ClerkTransaction[];
  members: ClerkMember[];
  activeNow: number;
  recordPayment: (input: RecordPaymentInput) => void;
  registerMember: (input: RegisterMemberInput) => ClerkMember | null;
  addMemberFromApproval: (input: AddMemberFromApprovalInput) => void;
  getTodayTransactions: () => ClerkTransaction[];
  getTodayStats: () => {
    walkInsToday: number;
    revenueToday: number;
    newMembersToday: number;
    activeNow: number;
  };
}

export const useClerkStore = create<ClerkState>()(
  persist(
    (set, get) => ({
      transactions: DEFAULT_TRANSACTIONS,
      members: DEFAULT_MEMBERS,
      activeNow: 45,

      recordPayment: (input) => {
        const transaction: ClerkTransaction = {
          id: `txn-${Date.now()}`,
          type: input.type,
          member: input.member.trim() || "Guest",
          amount: input.amount,
          method: input.method,
          notes: input.notes.trim(),
          createdAt: Date.now(),
        };
        set({ transactions: [transaction, ...get().transactions] });
      },

      registerMember: (input) => {
        const plan = MEMBERSHIP_PLANS.find((p) => p.id === input.planId);
        if (!plan) return null;

        const member: ClerkMember = {
          id: `member-${Date.now()}`,
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          phone: input.phone.trim(),
          email: input.email?.trim() || undefined,
          plan: plan.label,
          planPrice: plan.price,
          status: "active",
          joinedAt: Date.now(),
        };

        const transaction: ClerkTransaction = {
          id: `txn-${Date.now()}`,
          type: "monthly",
          member: `${member.firstName} ${member.lastName}`,
          amount: plan.price,
          method: "cash",
          notes: `New ${plan.label.toLowerCase()} registration`,
          createdAt: Date.now(),
        };

        set({
          members: [member, ...get().members],
          transactions: [transaction, ...get().transactions],
          activeNow: get().activeNow + 1,
        });

        return member;
      },

      addMemberFromApproval: (input) => {
        const exists = get().members.some(
          (member) =>
            member.firstName.toLowerCase() === input.firstName.toLowerCase() &&
            member.lastName.toLowerCase() === input.lastName.toLowerCase(),
        );
        if (exists) return;

        const member: ClerkMember = {
          id: `member-${Date.now()}`,
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          phone: "—",
          email: input.email?.trim() || undefined,
          plan: input.plan,
          planPrice: input.planPrice,
          status: "active",
          joinedAt: Date.now(),
        };

        set({
          members: [member, ...get().members],
          activeNow: get().activeNow + 1,
        });
      },

      getTodayTransactions: () => {
        const todayStart = startOfToday();
        return get().transactions.filter((txn) => txn.createdAt >= todayStart);
      },

      getTodayStats: () => {
        const todayStart = startOfToday();
        const todayTxns = get().transactions.filter((txn) => txn.createdAt >= todayStart);
        const newMembersToday = get().members.filter((m) => m.joinedAt >= todayStart).length;

        return {
          walkInsToday: todayTxns.length,
          revenueToday: todayTxns.reduce((sum, txn) => sum + txn.amount, 0),
          newMembersToday,
          activeNow: get().activeNow,
        };
      },
    }),
    {
      name: "fitfinder-clerk",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);


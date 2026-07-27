"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { OwnerPlanId } from "@/lib/owner-plans";
import { getOwnerPlan } from "@/lib/owner-plans";

export type OwnerPlanPaymentMethod = "Xendit";

export interface OwnerPlanTransaction {
  id: string;
  gymName: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  planId: OwnerPlanId;
  planName: string;
  type: "Owner Plan";
  amount: number;
  method: OwnerPlanPaymentMethod;
  referenceNo: string;
  createdAt: string;
}

function makeTransactionId() {
  const stamp = Date.now().toString().slice(-6);
  const rand = Math.floor(Math.random() * 900 + 100);
  return `TRX-${stamp}${rand}`;
}

function formatTransactionDate(isoDate: string) {
  return new Date(isoDate).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

const DEFAULT_STATS = {
  today: 45000,
  thisWeek: 312000,
  thisMonth: 1200000,
  total: 14500000,
};

const DEFAULT_TRANSACTIONS: OwnerPlanTransaction[] = [
  {
    id: "TRX-884201",
    gymName: "Powerhouse Fitness",
    ownerId: "po-2",
    ownerName: "Liza Gomez",
    ownerEmail: "liza@powerhouse.fit",
    planId: "standard",
    planName: "Standard",
    type: "Owner Plan",
    amount: 699,
    method: "Xendit",
    referenceNo: "XDT-8842011",
    createdAt: "2026-05-25T10:30:00.000Z",
  },
  {
    id: "TRX-884202",
    gymName: "Powerhouse Fitness",
    ownerId: "po-2",
    ownerName: "Liza Gomez",
    ownerEmail: "liza@powerhouse.fit",
    planId: "standard",
    planName: "Standard",
    type: "Owner Plan",
    amount: 699,
    method: "Xendit",
    referenceNo: "XDT-8842022",
    createdAt: "2026-05-25T09:15:00.000Z",
  },
  {
    id: "TRX-884203",
    gymName: "Abbsy Mini Gym",
    ownerId: "po-1",
    ownerName: "Renz Aballe",
    ownerEmail: "renz@example.com",
    planId: "pro",
    planName: "Pro",
    type: "Owner Plan",
    amount: 1499,
    method: "Xendit",
    referenceNo: "XDT-8842033",
    createdAt: "2026-05-24T16:45:00.000Z",
  },
  {
    id: "TRX-884204",
    gymName: "The Iron Den",
    ownerId: "po-4",
    ownerName: "Marcus Lee",
    ownerEmail: "marcus@ironden.fit",
    planId: "starter",
    planName: "Starter",
    type: "Owner Plan",
    amount: 299,
    method: "Xendit",
    referenceNo: "XDT-8842044",
    createdAt: "2026-05-23T11:20:00.000Z",
  },
  {
    id: "TRX-884205",
    gymName: "The Zone Fitness",
    ownerId: "po-5",
    ownerName: "Carla Mendoza",
    ownerEmail: "carla@thezone.fit",
    planId: "standard",
    planName: "Standard",
    type: "Owner Plan",
    amount: 699,
    method: "Xendit",
    referenceNo: "XDT-8842055",
    createdAt: "2026-05-22T08:00:00.000Z",
  },
  {
    id: "TRX-884206",
    gymName: "Flex Fitness Studio",
    ownerId: "po-6",
    ownerName: "Alex Cruz",
    ownerEmail: "alex.cruz@example.com",
    planId: "standard",
    planName: "Standard",
    type: "Owner Plan",
    amount: 699,
    method: "Xendit",
    referenceNo: "XDT-8842066",
    createdAt: "2026-05-21T14:10:00.000Z",
  },
];

interface OwnerPlanTransactionsState {
  transactions: OwnerPlanTransaction[];
  stats: typeof DEFAULT_STATS;
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

export const useOwnerPlanTransactionsStore = create<OwnerPlanTransactionsState>()(
  persist(
    (set, get) => ({
      transactions: DEFAULT_TRANSACTIONS,
      stats: DEFAULT_STATS,

      recordPlanPurchase: (input) => {
        const plan = getOwnerPlan(input.planId);
        const txn: OwnerPlanTransaction = {
          id: makeTransactionId(),
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
    }),
    {
      name: "fitfinder-owner-plan-transactions",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export function formatOwnerPlanTransactionDate(isoDate: string) {
  return formatTransactionDate(isoDate);
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

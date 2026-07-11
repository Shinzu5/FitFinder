"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface MembershipPlan {
  id: string;
  name: string;
  price: number;
  durationDays: number;
  activeSubscribers: number;
}

export type MembershipPlanInput = Omit<MembershipPlan, "id" | "activeSubscribers"> & {
  activeSubscribers?: number;
};

const DEFAULT_PLANS: MembershipPlan[] = [
  {
    id: "plan-1",
    name: "1 Month Basic",
    price: 1000,
    durationDays: 30,
    activeSubscribers: 24,
  },
  {
    id: "plan-2",
    name: "3 Months Pro",
    price: 3000,
    durationDays: 90,
    activeSubscribers: 18,
  },
  {
    id: "plan-3",
    name: "1 Year Elite",
    price: 20000,
    durationDays: 365,
    activeSubscribers: 7,
  },
];

interface OwnerMembershipPlansState {
  plans: MembershipPlan[];
  addPlan: (plan: MembershipPlanInput) => void;
  updatePlan: (id: string, updates: MembershipPlanInput) => void;
  deletePlan: (id: string) => void;
}

export const useOwnerMembershipPlansStore = create<OwnerMembershipPlansState>()(
  persist(
    (set, get) => ({
      plans: DEFAULT_PLANS,

      addPlan: (plan) => {
        set({
          plans: [
            ...get().plans,
            {
              id: `plan-${Date.now()}`,
              name: plan.name.trim(),
              price: plan.price,
              durationDays: plan.durationDays,
              activeSubscribers: plan.activeSubscribers ?? 0,
            },
          ],
        });
      },

      updatePlan: (id, updates) => {
        set({
          plans: get().plans.map((plan) =>
            plan.id === id
              ? {
                  ...plan,
                  name: updates.name.trim(),
                  price: updates.price,
                  durationDays: updates.durationDays,
                }
              : plan,
          ),
        });
      },

      deletePlan: (id) => {
        set({ plans: get().plans.filter((plan) => plan.id !== id) });
      },
    }),
    {
      name: "fitfinder-owner-membership-plans",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export function formatPlanPrice(price: number) {
  return `₱${price.toLocaleString()}`;
}

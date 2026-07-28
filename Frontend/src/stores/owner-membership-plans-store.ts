"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import api from "@/lib/api";

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

interface OwnerMembershipPlansState {
  plans: MembershipPlan[];
  loading: boolean;
  fetchPlans: () => Promise<void>;
  addPlan: (plan: MembershipPlanInput) => Promise<void>;
  updatePlan: (id: string, updates: MembershipPlanInput) => Promise<void>;
  deletePlan: (id: string) => Promise<void>;
}

export const useOwnerMembershipPlansStore = create<OwnerMembershipPlansState>()(
  persist(
    (set, get) => ({
      plans: [],
      loading: false,

      fetchPlans: async () => {
        set({ loading: true });
        try {
          const { data } = await api.get("/owner/membership-plans");
          if (data.success) {
            set({ plans: data.data, loading: false });
            return;
          }
        } catch (error) {
          console.error("Failed to fetch plans:", error);
        }
        set({ loading: false });
      },

      addPlan: async (plan) => {
        try {
          const { data } = await api.post("/owner/membership-plans", plan);
          if (data.success) {
            set({
              plans: [...get().plans, { ...data.data, activeSubscribers: 0 }],
            });
            return;
          }
        } catch (error) {
          console.error("Failed to add plan:", error);
        }
        // Fallback local
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

      updatePlan: async (id, updates) => {
        try {
          await api.put(`/owner/membership-plans/${id}`, updates);
        } catch (error) {
          console.error("Failed to update plan:", error);
        }
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

      deletePlan: async (id) => {
        try {
          await api.delete(`/owner/membership-plans/${id}`);
        } catch (error) {
          console.error("Failed to delete plan:", error);
        }
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

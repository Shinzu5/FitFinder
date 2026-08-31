"use client";

import { create } from "zustand";
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

export const useOwnerMembershipPlansStore = create<OwnerMembershipPlansState>((set, get) => ({
  plans: [],
  loading: false,

  fetchPlans: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get("/owner/membership-plans");
      if (data.success) {
        set({ plans: data.data || [], loading: false });
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
          plans: [
            ...get().plans,
            {
              id: data.data.id,
              name: data.data.name,
              price: data.data.price,
              durationDays: data.data.durationDays,
              activeSubscribers: 0,
            },
          ],
        });
      }
    } catch (error) {
      console.error("Failed to add plan:", error);
    }
  },

  updatePlan: async (id, updates) => {
    try {
      const { data } = await api.put(`/owner/membership-plans/${id}`, updates);
      if (data.success) {
        set({
          plans: get().plans.map((plan) =>
            plan.id === id
              ? {
                  ...plan,
                  name: data.data.name,
                  price: data.data.price,
                  durationDays: data.data.durationDays,
                }
              : plan,
          ),
        });
      }
    } catch (error) {
      console.error("Failed to update plan:", error);
    }
  },

  deletePlan: async (id) => {
    try {
      const { data } = await api.delete(`/owner/membership-plans/${id}`);
      if (data.success) {
        set({ plans: get().plans.filter((plan) => plan.id !== id) });
      }
    } catch (error) {
      console.error("Failed to delete plan:", error);
    }
  },
}));

export function formatPlanPrice(price: number) {
  return `₱${price.toLocaleString()}`;
}

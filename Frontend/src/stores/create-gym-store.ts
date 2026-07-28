"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import api from "@/lib/api";
import { getAccessUntilDate, getOwnerPlan, type OwnerPlanId } from "@/lib/owner-plans";

export const DEFAULT_GYM_COVER_IMAGE =
  "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80";

export interface RegisteredGym {
  id: string;
  name: string;
  address: string;
  contactNumber: string;
  description: string;
  websiteOrSlug: string;
  coverPhotoName: string | null;
  coverImageUrl: string;
  membershipPrice: number;
  schedule: string;
  memberCount: number;
  createdAt: string;
}

export type GymProfileUpdate = Partial<
  Omit<RegisteredGym, "id" | "createdAt">
>;

export type RegisterGymPayload = Omit<
  RegisteredGym,
  "id" | "createdAt" | "coverImageUrl" | "membershipPrice" | "schedule" | "memberCount"
> & {
  coverImageUrl?: string;
  membershipPrice?: number;
  schedule?: string;
  memberCount?: number;
};

interface CreateGymState {
  selectedPlanId: OwnerPlanId;
  paymentComplete: boolean;
  referenceNo: string | null;
  paidAt: string | null;
  validUntil: string | null;
  gcashNumber: string;
  accountName: string;
  registeredGym: RegisteredGym | null;
  subscriptionId: string | null;
  setSelectedPlanId: (id: OwnerPlanId) => void;
  setPaymentDetails: (gcashNumber: string, accountName: string) => void;
  completePayment: () => Promise<void>;
  registerGym: (gym: RegisterGymPayload) => Promise<void>;
  updateGymProfile: (updates: GymProfileUpdate) => Promise<void>;
  deleteGym: () => Promise<void>;
  resetFlow: () => void;
}

export const useCreateGymStore = create<CreateGymState>()(
  persist(
    (set, get) => ({
      selectedPlanId: "standard",
      paymentComplete: false,
      referenceNo: null,
      paidAt: null,
      validUntil: null,
      gcashNumber: "",
      accountName: "",
      registeredGym: null,
      subscriptionId: null,

      setSelectedPlanId: (id) => set({ selectedPlanId: id }),

      setPaymentDetails: (gcashNumber, accountName) =>
        set({ gcashNumber, accountName }),

      completePayment: async () => {
        const plan = getOwnerPlan(get().selectedPlanId);
        try {
          const { data } = await api.post("/subscriptions/purchase", {
            planId: plan.id,
            planName: plan.name,
            price: plan.price,
            months: plan.months,
          });

          if (data.success) {
            set({
              paymentComplete: true,
              referenceNo: data.data.referenceNo,
              paidAt: data.data.paidAt,
              validUntil: data.data.validUntil,
              subscriptionId: data.data.id,
            });
          }
        } catch (error) {
          // Fallback to local
          set({
            paymentComplete: true,
            referenceNo: `XDT-${Date.now().toString().slice(-7)}-${Math.floor(Math.random() * 9000 + 1000)}`,
            paidAt: new Date().toISOString(),
            validUntil: getAccessUntilDate(plan.months),
          });
        }
      },

      registerGym: async (gym) => {
        try {
          const { data } = await api.post("/gyms", {
            name: gym.name,
            address: gym.address,
            contactNumber: gym.contactNumber,
            description: gym.description,
            websiteOrSlug: gym.websiteOrSlug,
            coverImageUrl: gym.coverImageUrl || DEFAULT_GYM_COVER_IMAGE,
            schedule: gym.schedule || "Mon-Sun: 6AM - 10PM",
            pricePerMonth: gym.membershipPrice || 799,
            subscriptionId: get().subscriptionId,
          });

          if (data.success) {
            set({
              registeredGym: {
                id: data.data.id,
                name: data.data.name,
                address: data.data.address,
                contactNumber: data.data.contactNumber,
                description: data.data.description,
                websiteOrSlug: data.data.website,
                coverPhotoName: gym.coverPhotoName,
                coverImageUrl: data.data.coverImageUrl || DEFAULT_GYM_COVER_IMAGE,
                membershipPrice: data.data.pricePerMonth || 799,
                schedule: data.data.schedule || "Mon-Sun: 6AM - 10PM",
                memberCount: 0,
                createdAt: data.data.createdAt,
              },
            });
            return;
          }
        } catch (error) {
          console.error("Failed to register gym:", error);
        }

        // Fallback to local
        set({
          registeredGym: {
            coverImageUrl: gym.coverImageUrl ?? DEFAULT_GYM_COVER_IMAGE,
            membershipPrice: gym.membershipPrice ?? 799,
            schedule: gym.schedule ?? "Mon-Sun: 6AM - 10PM",
            memberCount: gym.memberCount ?? 0,
            name: gym.name,
            address: gym.address,
            contactNumber: gym.contactNumber,
            description: gym.description,
            websiteOrSlug: gym.websiteOrSlug,
            coverPhotoName: gym.coverPhotoName,
            id: `gym-${Date.now()}`,
            createdAt: new Date().toISOString(),
          },
        });
      },

      updateGymProfile: async (updates) => {
        const gym = get().registeredGym;
        if (!gym) return;

        try {
          await api.put(`/gyms/${gym.id}`, updates);
        } catch (error) {
          console.error("Failed to update gym:", error);
        }

        set({ registeredGym: { ...gym, ...updates } });
      },

      deleteGym: async () => {
        const gym = get().registeredGym;
        if (gym) {
          try {
            await api.delete(`/gyms/${gym.id}`);
          } catch (error) {
            console.error("Failed to delete gym:", error);
          }
        }
        get().resetFlow();
      },

      resetFlow: () =>
        set({
          selectedPlanId: "standard",
          paymentComplete: false,
          referenceNo: null,
          paidAt: null,
          validUntil: null,
          gcashNumber: "",
          accountName: "",
          registeredGym: null,
          subscriptionId: null,
        }),
    }),
    {
      name: "fitfinder-create-gym",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

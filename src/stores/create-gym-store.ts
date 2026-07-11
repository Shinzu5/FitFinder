"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
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
  setSelectedPlanId: (id: OwnerPlanId) => void;
  setPaymentDetails: (gcashNumber: string, accountName: string) => void;
  completePayment: () => void;
  registerGym: (gym: RegisterGymPayload) => void;
  updateGymProfile: (updates: GymProfileUpdate) => void;
  deleteGym: () => void;
  resetFlow: () => void;
}

function makeReferenceNo() {
  const stamp = Date.now().toString().slice(-7);
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `XDT-${stamp}-${rand}`;
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

      setSelectedPlanId: (id) => set({ selectedPlanId: id }),

      setPaymentDetails: (gcashNumber, accountName) =>
        set({ gcashNumber, accountName }),

      completePayment: () => {
        const plan = getOwnerPlan(get().selectedPlanId);
        set({
          paymentComplete: true,
          referenceNo: makeReferenceNo(),
          paidAt: new Date().toISOString(),
          validUntil: getAccessUntilDate(plan.months),
        });
      },

      registerGym: (gym) => {
        set({
          registeredGym: {
            coverImageUrl: gym.coverImageUrl ?? DEFAULT_GYM_COVER_IMAGE,
            membershipPrice: gym.membershipPrice ?? 799,
            schedule: gym.schedule ?? "Mon-Sun: 6AM - 10PM",
            memberCount: gym.memberCount ?? 142,
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

      updateGymProfile: (updates) => {
        const gym = get().registeredGym;
        if (!gym) return;
        set({ registeredGym: { ...gym, ...updates } });
      },

      deleteGym: () => {
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
        }),
    }),
    {
      name: "fitfinder-create-gym",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

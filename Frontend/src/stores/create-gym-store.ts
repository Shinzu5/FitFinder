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
  xenditPaymentId: string | null;
  paymentRedirectUrl: string | null;
  paymentLoading: boolean;
  paymentError: string | null;
  registeredGym: RegisteredGym | null;
  subscriptionId: string | null;
  setSelectedPlanId: (id: OwnerPlanId) => void;
  initiateGcashPayment: () => Promise<string | null>;
  checkPaymentStatus: () => Promise<"PENDING" | "SUCCEEDED" | "FAILED">;
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
      xenditPaymentId: null,
      paymentRedirectUrl: null,
      paymentLoading: false,
      paymentError: null,
      registeredGym: null,
      subscriptionId: null,

      setSelectedPlanId: (id) => set({ selectedPlanId: id }),

      /**
       * Create a GCash payment via Xendit and return the redirect URL.
       * The user should be redirected to this URL to complete payment.
       */
      initiateGcashPayment: async () => {
        const plan = getOwnerPlan(get().selectedPlanId);
        set({ paymentLoading: true, paymentError: null });

        try {
          const { data } = await api.post("/payments/create-gcash", {
            type: "SUBSCRIPTION",
            amount: plan.price,
            description: `FitFinder ${plan.name} Plan — ${plan.months} month${plan.months > 1 ? "s" : ""}`,
            metadata: {
              planId: plan.id,
              planName: plan.name,
              months: plan.months,
              price: plan.price,
            },
          });

          if (data.success && data.data.redirectUrl) {
            set({
              xenditPaymentId: data.data.xenditPaymentId,
              paymentRedirectUrl: data.data.redirectUrl,
              referenceNo: data.data.referenceId,
              paymentLoading: false,
            });
            return data.data.redirectUrl;
          }

          set({ paymentLoading: false, paymentError: "Failed to create payment" });
          return null;
        } catch (error) {
          console.error("Failed to initiate GCash payment:", error);
          set({
            paymentLoading: false,
            paymentError: "Failed to create GCash payment. Please try again.",
          });
          return null;
        }
      },

      /**
       * Check payment status by polling the backend (which checks Xendit).
       */
      checkPaymentStatus: async () => {
        const paymentId = get().xenditPaymentId;
        if (!paymentId) return "PENDING";

        try {
          const { data } = await api.get(`/payments/${paymentId}/status`);

          if (data.success) {
            const status = data.data.status;

            if (status === "SUCCEEDED") {
              const plan = getOwnerPlan(get().selectedPlanId);
              set({
                paymentComplete: true,
                paidAt: data.data.paidAt || new Date().toISOString(),
                validUntil: getAccessUntilDate(plan.months),
                referenceNo: data.data.referenceId || get().referenceNo,
              });
              return "SUCCEEDED";
            }

            if (status === "FAILED" || status === "EXPIRED") {
              set({ paymentError: "Payment was not completed" });
              return "FAILED";
            }
          }

          return "PENDING";
        } catch (error) {
          console.error("Payment status check failed:", error);
          return "PENDING";
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
          if (gym.id.startsWith("gym-")) {
            // Gym was only saved locally (due to previous token error). Create it now!
            const { data } = await api.post("/gyms", {
              name: updates.name ?? gym.name,
              address: updates.address ?? gym.address,
              contactNumber: updates.contactNumber ?? gym.contactNumber,
              description: updates.description ?? gym.description,
              websiteOrSlug: updates.websiteOrSlug ?? gym.websiteOrSlug,
              coverImageUrl: updates.coverImageUrl ?? gym.coverImageUrl,
              schedule: updates.schedule ?? gym.schedule,
              pricePerMonth: updates.membershipPrice ?? gym.membershipPrice,
              subscriptionId: get().subscriptionId,
            });
            if (data.success) {
              set({
                registeredGym: {
                  ...gym,
                  ...updates,
                  id: data.data.id,
                  createdAt: data.data.createdAt,
                }
              });
              return;
            }
          } else {
            await api.put(`/gyms/${gym.id}`, updates);
          }
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
          xenditPaymentId: null,
          paymentRedirectUrl: null,
          paymentLoading: false,
          paymentError: null,
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

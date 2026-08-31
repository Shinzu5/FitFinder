"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import api, { setMemoryAccessToken } from "@/lib/api";
import { getAccessUntilDate, getOwnerPlan, type OwnerPlanId } from "@/lib/owner-plans";
import { useAuthStore } from "@/stores/auth-store";

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
  schedule: string;
  memberCount: number;
  createdAt: string;
  /** PENDING until admin publishes (ACTIVE) */
  status?: "PENDING" | "ACTIVE" | "DECLINED";
}

export type GymProfileUpdate = Partial<
  Omit<RegisteredGym, "id" | "createdAt">
>;

export type RegisterGymPayload = Omit<
  RegisteredGym,
  "id" | "createdAt" | "coverImageUrl" | "schedule" | "memberCount"
> & {
  coverImageUrl?: string;
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
  /** null = not checked yet; driven by GET /owner/my-gym */
  hasOwnedGym: boolean | null;
  checkingOwnedGym: boolean;
  setSelectedPlanId: (id: OwnerPlanId) => void;
  initiateGcashPayment: () => Promise<string | null>;
  checkPaymentStatus: (paymentIdOverride?: string | null) => Promise<"PENDING" | "SUCCEEDED" | "FAILED">;
  fetchOwnedGymStatus: (opts?: { full?: boolean }) => Promise<boolean>;
  registerGym: (gym: RegisterGymPayload) => Promise<boolean>;
  updateGymProfile: (updates: GymProfileUpdate) => Promise<boolean>;
  deleteGym: () => Promise<void>;
  resetFlow: () => void;
}

function mapApiGymToRegistered(gym: any): RegisteredGym {
  return {
    id: gym.id,
    name: gym.name,
    address: gym.address || "",
    contactNumber: gym.contactNumber || "",
    description: gym.description || "",
    websiteOrSlug: gym.website || gym.websiteOrSlug || "",
    coverPhotoName: null,
    coverImageUrl: gym.coverImageUrl || DEFAULT_GYM_COVER_IMAGE,
    schedule: gym.schedule || "Mon-Sun: 6AM - 10PM",
    memberCount: gym.memberCount ?? gym._count?.gymMemberships ?? 0,
    createdAt: gym.createdAt || new Date().toISOString(),
    status: gym.status || "PENDING",
  };
}

/** True when OwnerSubscription.validUntil is still in the future. */
async function hasActiveOwnerPlan(): Promise<boolean> {
  try {
    const { data } = await api.get("/subscriptions/my-plan");
    if (!data.success || !data.data?.validUntil) return false;
    return new Date(data.data.validUntil).getTime() > Date.now();
  } catch {
    return false;
  }
}

export const useCreateGymStore = create<CreateGymState>()(
  persist(
    (set, get) => ({
      selectedPlanId: "popular",
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
      hasOwnedGym: null,
      checkingOwnedGym: false,

      setSelectedPlanId: (id) => set({ selectedPlanId: id }),

      /**
       * Source of truth: PostgreSQL via GET /owner/my-gym?light=1 (ownership only).
       * Also hydrates registeredGym so My Gym UI works for seeded / existing owners.
       */
      fetchOwnedGymStatus: async (opts) => {
        // Avoid parallel stampedes from layout + pollers
        if (get().checkingOwnedGym) {
          return get().hasOwnedGym === true;
        }

        set({ checkingOwnedGym: true });
        try {
          const { data } = await api.get("/owner/my-gym", {
            params: opts?.full ? undefined : { light: 1 },
          });
          if (data.success && data.data) {
            const prev = get().registeredGym;
            set({
              hasOwnedGym: true,
              registeredGym: opts?.full || !prev
                ? mapApiGymToRegistered(data.data)
                : {
                    ...prev,
                    id: data.data.id,
                    name: data.data.name || prev.name,
                    status: data.data.status || prev.status,
                  },
              checkingOwnedGym: false,
            });
            return true;
          }

          // No gym — keep payment only if an active platform plan still exists
          const hasActivePlan = await hasActiveOwnerPlan();
          set({ hasOwnedGym: false, registeredGym: null, checkingOwnedGym: false });
          if (!hasActivePlan) {
            get().resetFlow();
          } else if (!get().paymentComplete) {
            set({ paymentComplete: true });
          }
          return false;
        } catch (error: any) {
          const status = error?.response?.status;
          if (status === 401 || status === 403 || status === 404) {
            const hasActivePlan = await hasActiveOwnerPlan();
            set({ hasOwnedGym: false, registeredGym: null, checkingOwnedGym: false });
            if (!hasActivePlan) {
              // Gym deleted (or role demoted) and plan wiped → must pay again
              get().resetFlow();
            } else if (!get().paymentComplete) {
              set({ paymentComplete: true });
            }
            return false;
          }
          // 500 / network / Neon blip — keep last known ownership (do not kick owner)
          set({ checkingOwnedGym: false });
          return get().hasOwnedGym === true;
        }
      },

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
            description: `FitFinder ${plan.name} Plan — ${plan.days} days`,
            metadata: {
              planId: plan.id,
              planName: plan.name,
              days: plan.days,
              durationDays: plan.days,
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
      checkPaymentStatus: async (paymentIdOverride) => {
        const paymentId = paymentIdOverride || get().xenditPaymentId;
        if (!paymentId) return "PENDING";

        try {
          const { data } = await api.get(`/payments/${paymentId}/status`);

          if (data.success) {
            const status = data.data.status;

            if (status === "SUCCEEDED") {
              const plan = getOwnerPlan(get().selectedPlanId);
              const sub = data.data.subscription;
              const validUntilIso = sub?.validUntil as string | undefined;

              set({
                paymentComplete: true,
                paidAt: data.data.paidAt || new Date().toISOString(),
                validUntil: validUntilIso
                  ? new Date(validUntilIso).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : getAccessUntilDate(plan.days),
                referenceNo: data.data.referenceId || get().referenceNo,
                subscriptionId: sub?.id || get().subscriptionId,
              });

              // Apply OWNER auth immediately — no refresh required
              if (data.data.accessToken && data.data.user) {
                setMemoryAccessToken(data.data.accessToken);
                useAuthStore.setState({
                  accessToken: data.data.accessToken,
                  user: {
                    id: data.data.user.id,
                    fullName: data.data.user.fullName,
                    email: data.data.user.email,
                    role: data.data.user.role,
                    avatarUrl: data.data.user.avatarUrl || undefined,
                  },
                  role: data.data.user.role,
                  isAuthenticated: true,
                });
              } else {
                useAuthStore.getState().promoteToOwner();
              }

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
            subscriptionId: get().subscriptionId,
          });

          if (data.success && data.data) {
            // Sync auth to OWNER if backend issued fresh tokens
            if (data.data.accessToken && data.data.user) {
              setMemoryAccessToken(data.data.accessToken);
              useAuthStore.setState({
                accessToken: data.data.accessToken,
                user: {
                  id: data.data.user.id,
                  fullName: data.data.user.fullName,
                  email: data.data.user.email,
                  role: data.data.user.role,
                  avatarUrl: data.data.user.avatarUrl || undefined,
                },
                role: data.data.user.role,
                isAuthenticated: true,
              });
            }

            // New gym = empty slate (never inherit prior gym's client caches)
            const { clearOwnerGymLocalState } = await import(
              "@/lib/clear-owner-gym-state"
            );
            clearOwnerGymLocalState();

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
                schedule: data.data.schedule || "Mon-Sun: 6AM - 10PM",
                memberCount: 0,
                createdAt: data.data.createdAt,
                status: data.data.status || "PENDING",
              },
              hasOwnedGym: true,
            });
            return true;
          }
        } catch (error) {
          console.error("Failed to register gym:", error);
        }

        // Do not unlock dashboard with a local-only fake gym — DB association is required.
        return false;
      },

      updateGymProfile: async (updates) => {
        const gym = get().registeredGym;
        if (!gym) return false;

        try {
          const payload = {
            name: updates.name ?? gym.name,
            address: updates.address ?? gym.address,
            contactNumber: updates.contactNumber ?? gym.contactNumber,
            description: updates.description ?? gym.description,
            websiteOrSlug: updates.websiteOrSlug ?? gym.websiteOrSlug,
            coverImageUrl: updates.coverImageUrl ?? gym.coverImageUrl,
            schedule: updates.schedule ?? gym.schedule,
          };

          const { data } = await api.put(`/gyms/${gym.id}`, payload);
          if (data.success && data.data) {
            set({
              registeredGym: {
                ...gym,
                ...updates,
                name: data.data.name,
                address: data.data.address,
                contactNumber: data.data.contactNumber,
                description: data.data.description,
                websiteOrSlug: data.data.website,
                coverImageUrl: data.data.coverImageUrl || gym.coverImageUrl,
                schedule: data.data.schedule || gym.schedule,
              },
            });
            return true;
          }
        } catch (error) {
          console.error("Failed to update gym:", error);
        }

        return false;
      },

      deleteGym: async () => {
        const gym = get().registeredGym;
        if (gym) {
          try {
            await api.delete(`/gyms/${gym.id}`);
          } catch (error) {
            console.error("Failed to delete gym:", error);
            throw error;
          }
        }
        const { clearOwnerGymLocalState } = await import("@/lib/clear-owner-gym-state");
        clearOwnerGymLocalState();
        get().resetFlow();
        set({ hasOwnedGym: false });
      },

      resetFlow: () =>
        set({
          selectedPlanId: "popular",
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
          hasOwnedGym: false,
          checkingOwnedGym: false,
        }),
    }),
    {
      name: "fitfinder-create-gym",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        selectedPlanId: state.selectedPlanId,
        paymentComplete: state.paymentComplete,
        referenceNo: state.referenceNo,
        paidAt: state.paidAt,
        validUntil: state.validUntil,
        xenditPaymentId: state.xenditPaymentId,
        paymentRedirectUrl: state.paymentRedirectUrl,
        registeredGym: state.registeredGym,
        subscriptionId: state.subscriptionId,
      }),
    },
  ),
);

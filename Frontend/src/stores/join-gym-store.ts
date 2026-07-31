"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type JoinPaymentMethod = "cashless" | "walk-in";

export interface CompletedMembership {
  gymId: string;
  gymName: string;
  planId: string;
  planName: string;
  planPrice: number;
  coachId: string | null;
  coachName: string | null;
  coachSessionPrice: number;
  paymentMethod: JoinPaymentMethod;
  paymentRef: string;
  totalPaid: number;
  joinedAt?: string;
  durationDays?: number;
}

interface JoinGymFlowState {
  gymId: string | null;
  selectedPlanId: string | null;
  paymentMethod: JoinPaymentMethod;
  selectedCoachId: string | null;
  xenditPaymentId: string | null;
  paymentLoading: boolean;
  paymentError: string | null;
  initJoin: (gymId: string, defaultPlanId: string, cashlessEnabled?: boolean) => void;
  setPlanId: (planId: string) => void;
  setPaymentMethod: (method: JoinPaymentMethod) => void;
  setCoachId: (coachId: string | null) => void;
  setXenditPaymentId: (id: string | null) => void;
  setPaymentLoading: (loading: boolean) => void;
  setPaymentError: (error: string | null) => void;
  resetJoin: () => void;
}

export function makeXenditRef() {
  return `XDT-${Date.now().toString().slice(-8)}`;
}

export function makeWalkInRef(gymName: string) {
  const prefix = gymName
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 5) || "GYM";
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `${prefix}-${year}-${rand}`;
}

export const useJoinGymStore = create<JoinGymFlowState>()(
  persist(
    (set) => ({
      gymId: null,
      selectedPlanId: null,
      paymentMethod: "walk-in",
      selectedCoachId: null,
      xenditPaymentId: null,
      paymentLoading: false,
      paymentError: null,

      initJoin: (gymId, defaultPlanId, cashlessEnabled = false) =>
        set({
          gymId,
          selectedPlanId: defaultPlanId,
          paymentMethod: cashlessEnabled ? "cashless" : "walk-in",
          selectedCoachId: null,
          xenditPaymentId: null,
          paymentLoading: false,
          paymentError: null,
        }),

      setPlanId: (planId) => set({ selectedPlanId: planId }),
      setPaymentMethod: (method) => set({ paymentMethod: method }),
      setCoachId: (coachId) => set({ selectedCoachId: coachId }),
      setXenditPaymentId: (id) => set({ xenditPaymentId: id }),
      setPaymentLoading: (loading) => set({ paymentLoading: loading }),
      setPaymentError: (error) => set({ paymentError: error }),

      resetJoin: () =>
        set({
          gymId: null,
          selectedPlanId: null,
          paymentMethod: "walk-in",
          selectedCoachId: null,
          xenditPaymentId: null,
          paymentLoading: false,
          paymentError: null,
        }),
    }),
    {
      name: "fitfinder-join-gym-flow",
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);

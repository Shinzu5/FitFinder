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
}

interface JoinGymFlowState {
  gymId: string | null;
  selectedPlanId: string | null;
  paymentMethod: JoinPaymentMethod;
  selectedCoachId: string | null;
  gcashNumber: string;
  gcashName: string;
  initJoin: (gymId: string, defaultPlanId: string) => void;
  setPlanId: (planId: string) => void;
  setPaymentMethod: (method: JoinPaymentMethod) => void;
  setCoachId: (coachId: string | null) => void;
  setGcashNumber: (value: string) => void;
  setGcashName: (value: string) => void;
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
      paymentMethod: "cashless",
      selectedCoachId: null,
      gcashNumber: "",
      gcashName: "",

      initJoin: (gymId, defaultPlanId) =>
        set({
          gymId,
          selectedPlanId: defaultPlanId,
          paymentMethod: "cashless",
          selectedCoachId: null,
          gcashNumber: "",
          gcashName: "",
        }),

      setPlanId: (planId) => set({ selectedPlanId: planId }),
      setPaymentMethod: (method) => set({ paymentMethod: method }),
      setCoachId: (coachId) => set({ selectedCoachId: coachId }),
      setGcashNumber: (value) => set({ gcashNumber: value }),
      setGcashName: (value) => set({ gcashName: value }),

      resetJoin: () =>
        set({
          gymId: null,
          selectedPlanId: null,
          paymentMethod: "cashless",
          selectedCoachId: null,
          gcashNumber: "",
          gcashName: "",
        }),
    }),
    {
      name: "fitfinder-join-gym-flow",
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);

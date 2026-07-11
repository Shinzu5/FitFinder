"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CompletedMembership, JoinPaymentMethod } from "./join-gym-store";

interface MembershipState {
  joinedGymId: string | null;
  membership: CompletedMembership | null;
  joinGym: (details: CompletedMembership) => void;
  leaveGym: () => void;
}

export const useMembershipStore = create<MembershipState>()(
  persist(
    (set) => ({
      joinedGymId: null,
      membership: null,

      joinGym: (details) =>
        set({
          joinedGymId: details.gymId,
          membership: details,
        }),

      leaveGym: () => set({ joinedGymId: null, membership: null }),
    }),
    {
      name: "fitfinder-membership",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export type { JoinPaymentMethod };

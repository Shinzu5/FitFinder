"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { mockGyms, type Gym } from "@/lib/mock-gyms";

interface MembershipState {
  joinedGymId: string | null;
  joinGym: (gymId: string) => void;
  leaveGym: () => void;
  getJoinedGym: () => Gym | null;
}

export const useMembershipStore = create<MembershipState>()(
  persist(
    (set, get) => ({
      joinedGymId: null,
      joinGym: (gymId) => set({ joinedGymId: gymId }),
      leaveGym: () => set({ joinedGymId: null }),
      getJoinedGym: () => {
        const id = get().joinedGymId;
        if (!id) return null;
        return mockGyms.find((gym) => gym.id === id) ?? null;
      },
    }),
    {
      name: "fitfinder-membership",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ joinedGymId: state.joinedGymId }),
    },
  ),
);

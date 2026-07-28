"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import api from "@/lib/api";

export type MemberBillingCycle = "Monthly" | "Quarterly" | "Yearly";
export type MemberStatus = "active" | "expiring";
export type PaymentStatus = "paid" | "unpaid";

export interface GymMember {
  id: string;
  fullName: string;
  email: string;
  billingCycle: MemberBillingCycle;
  planName: string;
  totalDays: number;
  remainingDays: number;
  paymentStatus: PaymentStatus;
  status: MemberStatus;
  addedByClerk: boolean;
}

interface OwnerMembersState {
  members: GymMember[];
  loading: boolean;
  fetchMembers: () => Promise<void>;
  removeMember: (id: string) => Promise<void>;
}

export const useOwnerMembersStore = create<OwnerMembersState>()(
  persist(
    (set, get) => ({
      members: [],
      loading: false,

      fetchMembers: async () => {
        set({ loading: true });
        try {
          const { data } = await api.get("/owner/members");
          if (data.success) {
            set({ members: data.data, loading: false });
            return;
          }
        } catch (error) {
          console.error("Failed to fetch members:", error);
        }
        set({ loading: false });
      },

      removeMember: async (id) => {
        try {
          await api.delete(`/owner/members/${id}`);
        } catch (error) {
          console.error("Failed to remove member:", error);
        }
        set({ members: get().members.filter((m) => m.id !== id) });
      },
    }),
    {
      name: "fitfinder-owner-members",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export function getMemberInitials(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

export function getMembershipProgress(member: GymMember) {
  if (member.totalDays <= 0) return 0;
  return Math.min(100, Math.max(0, (member.remainingDays / member.totalDays) * 100));
}

"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

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

const DEFAULT_MEMBERS: GymMember[] = [
  {
    id: "member-1",
    fullName: "Pedro Penduko",
    email: "pedro@example.com",
    billingCycle: "Monthly",
    planName: "3 Months Pro",
    totalDays: 90,
    remainingDays: 5,
    paymentStatus: "paid",
    status: "expiring",
    addedByClerk: true,
  },
  {
    id: "member-2",
    fullName: "Ana Santos",
    email: "ana.santos@example.com",
    billingCycle: "Monthly",
    planName: "1 Year Elite",
    totalDays: 365,
    remainingDays: 300,
    paymentStatus: "paid",
    status: "active",
    addedByClerk: true,
  },
];

interface OwnerMembersState {
  members: GymMember[];
  removeMember: (id: string) => void;
}

export const useOwnerMembersStore = create<OwnerMembersState>()(
  persist(
    (set, get) => ({
      members: DEFAULT_MEMBERS,

      removeMember: (id) => {
        set({ members: get().members.filter((member) => member.id !== id) });
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

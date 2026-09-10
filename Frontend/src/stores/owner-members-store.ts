"use client";

import { create } from "zustand";
import api from "@/lib/api";
import { asRecord } from "@/lib/api-error";

export type MemberBillingCycle = "Monthly" | "Quarterly" | "Yearly";
export type MemberStatus = "active" | "expiring" | "expired";
export type PaymentStatus = "paid" | "unpaid";
export type MemberTypeLabel = "Walk-in" | "Online";
export type RegisteredByLabel = "Owner" | "Clerk" | "Self";

export interface GymMember {
  id: string;
  fullName: string;
  email: string;
  memberType: MemberTypeLabel;
  billingCycle: MemberBillingCycle;
  planName: string;
  totalDays: number;
  remainingDays: number;
  paymentStatus: PaymentStatus;
  status: MemberStatus;
  totalPaid: number;
  startsAt: string;
  expiresAt: string;
  registrationDate: string;
  registeredBy: RegisteredByLabel;
  addedByClerk: boolean;
}

interface OwnerMembersState {
  members: GymMember[];
  loading: boolean;
  fetchMembers: (opts?: { silent?: boolean }) => Promise<void>;
  removeMember: (id: string) => Promise<void>;
}

function mapMember(value: unknown): GymMember {
  const raw = asRecord(value);
  const totalDays = Number(raw.totalDays) || 0;
  const remainingDays = Number(raw.remainingDays) || 0;
  return {
    id: String(raw.id ?? ""),
    fullName: String(raw.fullName || ""),
    email: String(raw.email || ""),
    memberType: raw.memberType === "Online" ? "Online" : "Walk-in",
    billingCycle: (String(raw.billingCycle || "Monthly") as MemberBillingCycle) || "Monthly",
    planName: String(raw.planName || raw.plan || "Plan"),
    totalDays,
    remainingDays,
    paymentStatus: raw.paymentStatus === "unpaid" ? "unpaid" : "paid",
    status: (String(raw.status || "active") as MemberStatus) || "active",
    totalPaid: Number(raw.totalPaid) || 0,
    startsAt: String(raw.startsAt || ""),
    expiresAt: String(raw.expiresAt || ""),
    registrationDate: String(raw.registrationDate || raw.joinedAt || ""),
    registeredBy:
      raw.registeredBy === "Owner" || raw.registeredBy === "Clerk"
        ? raw.registeredBy
        : "Self",
    addedByClerk: Boolean(raw.addedByClerk) || raw.registeredBy === "Clerk",
  };
}

export const useOwnerMembersStore = create<OwnerMembersState>((set, get) => ({
  members: [],
  loading: false,

  fetchMembers: async (opts) => {
    if (!opts?.silent) set({ loading: true });
    try {
      const { data } = await api.get("/owner/members");
      if (data.success) {
        set({
          members: (data.data || []).map(mapMember),
          loading: false,
        });
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
}));

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

export function formatMemberDate(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

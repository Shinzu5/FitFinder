"use client";

import { create } from "zustand";
import api from "@/lib/api";
import { asRecord, getApiErrorMessage } from "@/lib/api-error";
import type { CompletedMembership, JoinPaymentMethod } from "./join-gym-store";

export interface RenewalHistoryItem {
  id: string;
  planName: string;
  planPrice: number;
  durationDays: number;
  totalPaid: number;
  paymentMethod: string;
  renewalDate: string;
}

export interface EnrolledGymMembership {
  membershipId: string;
  gymId: string;
  gymName: string;
  gymAddress: string;
  coverImageUrl: string;
  planId: string | null;
  planName: string;
  planPrice: number;
  planType: string;
  durationDays: number;
  remainingDays: number;
  status: string;
  memberType: string;
  paymentMethod: string;
  paymentRef: string;
  totalPaid: number;
  coachId: string | null;
  coachName: string | null;
  coachSessionPrice: number;
  joinedAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

interface MembershipState {
  /** Currently selected (active) gym session */
  joinedGymId: string | null;
  membership: CompletedMembership | null;
  memberships: EnrolledGymMembership[];
  enrolledGymIds: string[];
  renewalHistory: RenewalHistoryItem[];
  loading: boolean;
  switching: boolean;
  error: string | null;
  fetchMembership: () => Promise<void>;
  fetchMemberships: () => Promise<void>;
  selectActiveGym: (gymId: string) => Promise<boolean>;
  isEnrolledIn: (gymId: string) => boolean;
  joinGym: (details: CompletedMembership) => Promise<boolean>;
  leaveGym: () => Promise<void>;
}

function mapMembership(value: unknown): CompletedMembership {
  const data = asRecord(value);
  return {
    gymId: String(data.gymId ?? ""),
    gymName: String(data.gymName ?? ""),
    planId: data.planId == null ? null : String(data.planId),
    planName: String(data.planName ?? ""),
    planPrice: Number(data.planPrice) || 0,
    coachId: data.coachId == null ? null : String(data.coachId),
    coachName: data.coachName == null ? null : String(data.coachName),
    coachSessionPrice: Number(data.coachSessionPrice ?? 0) || 0,
    paymentMethod: (String(data.paymentMethod || "cashless").toLowerCase() === "cash" ||
    String(data.paymentMethod || "").toLowerCase() === "walk-in"
      ? String(data.paymentMethod).toLowerCase()
      : "cashless") as JoinPaymentMethod,
    paymentRef: String(data.paymentRef ?? ""),
    totalPaid: Number(data.totalPaid) || 0,
    joinedAt: String(data.joinedAt ?? ""),
    expiresAt: data.expiresAt ? String(data.expiresAt) : undefined,
    durationDays: Number(data.durationDays) || 0,
  };
}

function mapEnrolled(value: unknown): EnrolledGymMembership {
  const raw = asRecord(value);
  return {
    membershipId: String(raw.membershipId || ""),
    gymId: String(raw.gymId || ""),
    gymName: String(raw.gymName || "Gym"),
    gymAddress: String(raw.gymAddress || ""),
    coverImageUrl: String(raw.coverImageUrl || ""),
    planId: raw.planId == null ? null : String(raw.planId),
    planName: String(raw.planName || "Plan"),
    planPrice: Number(raw.planPrice) || 0,
    planType: String(raw.planType || "Walk-in"),
    durationDays: Number(raw.durationDays) || 0,
    remainingDays: Number(raw.remainingDays) || 0,
    status: String(raw.status || "Active"),
    memberType: String(raw.memberType || ""),
    paymentMethod: String(raw.paymentMethod || ""),
    paymentRef: String(raw.paymentRef || ""),
    totalPaid: Number(raw.totalPaid) || 0,
    coachId: raw.coachId == null ? null : String(raw.coachId),
    coachName: raw.coachName == null ? null : String(raw.coachName),
    coachSessionPrice: Number(raw.coachSessionPrice) || 0,
    joinedAt: String(raw.joinedAt || ""),
    expiresAt: String(raw.expiresAt || ""),
    isCurrent: Boolean(raw.isCurrent),
  };
}

function mapRenewalHistory(raw: unknown): RenewalHistoryItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((value) => {
    const item = asRecord(value);
    return {
      id: String(item.id),
      planName: String(item.planName || "Plan"),
      planPrice: Number(item.planPrice) || 0,
      durationDays: Number(item.durationDays) || 0,
      totalPaid: Number(item.totalPaid) || 0,
      paymentMethod: String(item.paymentMethod || "Walk-in"),
      renewalDate: String(item.renewalDate || ""),
    };
  });
}

function isMembershipExpired(membership: CompletedMembership): boolean {
  if (!membership.expiresAt) return false;
  return new Date(membership.expiresAt).getTime() <= Date.now();
}

export const useMembershipStore = create<MembershipState>((set, get) => ({
  joinedGymId: null,
  membership: null,
  memberships: [],
  enrolledGymIds: [],
  renewalHistory: [],
  loading: false,
  switching: false,
  error: null,

  isEnrolledIn: (gymId: string) => get().enrolledGymIds.includes(gymId),

  fetchMemberships: async () => {
    try {
      const { data } = await api.get("/user/memberships");
      if (!data.success || !data.data) {
        set({ memberships: [], enrolledGymIds: [] });
        return;
      }
      const list = Array.isArray(data.data.memberships)
        ? data.data.memberships.map(mapEnrolled)
        : [];
      set({
        memberships: list,
        enrolledGymIds: list
          .filter((m: EnrolledGymMembership) => m.status !== "Expired")
          .map((m: EnrolledGymMembership) => m.gymId),
      });
      // Do not overwrite joinedGymId here — fetchMembership owns the active session
    } catch {
      // Keep last known list on transient errors
    }
  },

  fetchMembership: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.get("/user/membership");
      if (!data.success || !data.data) {
        set({
          joinedGymId: null,
          membership: null,
          renewalHistory: [],
          memberships: [],
          enrolledGymIds: [],
          loading: false,
        });
        return;
      }

      const membership = mapMembership(data.data);
      if (isMembershipExpired(membership)) {
        set({
          joinedGymId: null,
          membership: null,
          renewalHistory: [],
          loading: false,
          error: null,
        });
        await get().fetchMemberships();
        return;
      }

      const enrolledGymIds = Array.isArray(data.data.enrolledGymIds)
        ? data.data.enrolledGymIds.map(String)
        : [membership.gymId];

      set({
        joinedGymId: membership.gymId,
        membership,
        enrolledGymIds,
        renewalHistory: mapRenewalHistory(data.data.renewalHistory),
        loading: false,
        error: null,
      });

      void get().fetchMemberships();
    } catch (error: unknown) {
      set({
        loading: false,
        error: getApiErrorMessage(error, "Failed to load membership."),
      });
    }
  },

  selectActiveGym: async (gymId: string) => {
    if (!gymId) return false;
    if (get().joinedGymId === gymId) return true;

    set({ switching: true, error: null });
    try {
      const { data } = await api.patch("/user/active-gym", { gymId });
      if (!data.success) {
        set({
          switching: false,
          error: data.message || "Failed to switch gym.",
        });
        return false;
      }

      await get().fetchMembership();
      set({ switching: false });
      return true;
    } catch (error: unknown) {
      set({
        switching: false,
        error: getApiErrorMessage(error, "Failed to switch gym."),
      });
      return false;
    }
  },

  joinGym: async (details) => {
    try {
      const { data } = await api.post("/user/join-gym", {
        gymId: details.gymId,
        planId: details.planId,
        coachId: details.coachId,
        paymentMethod: details.paymentMethod,
        paymentRef: details.paymentRef,
        totalPaid: details.totalPaid,
      });

      if (!data.success) {
        set({ error: data.message || "Failed to join gym." });
        return false;
      }

      // Walk-in / renewal creates an approval, not an immediate date change
      if (details.paymentMethod === "walk-in") {
        set({ error: null });
        return true;
      }

      const membership = data.data?.membership
        ? mapMembership({
            ...data.data.membership,
            gymName: details.gymName,
            planName: details.planName,
            planPrice: details.planPrice,
            coachName: details.coachName,
            coachSessionPrice: details.coachSessionPrice,
            durationDays: details.durationDays,
          })
        : details;

      // Only replace active session when none is set yet
      if (!get().joinedGymId) {
        set({
          joinedGymId: membership.gymId,
          membership,
          error: null,
        });
      } else {
        set({ error: null });
      }
      void get().fetchMemberships();
      return true;
    } catch (error: unknown) {
      set({ error: getApiErrorMessage(error, "Failed to join gym.") });
      return false;
    }
  },

  leaveGym: async () => {
    try {
      await api.delete("/user/membership");
    } catch {
      // Still clear local state if already gone server-side
    }
    await get().fetchMembership();
  },
}));

export type { JoinPaymentMethod };

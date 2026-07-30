"use client";

import { create } from "zustand";
import api from "@/lib/api";
import type { CompletedMembership } from "./join-gym-store";

export type ApprovalStatus = "pending" | "approved" | "declined";

export interface WalkInApprovalRequest {
  id: string;
  userId: string;
  memberName: string;
  memberEmail: string;
  gymId: string;
  gymName: string;
  planId: string;
  planName: string;
  planPrice: number;
  coachId: string | null;
  coachName: string | null;
  coachSessionPrice: number;
  paymentRef: string;
  totalPaid: number;
  durationDays: number;
  status: ApprovalStatus;
  submittedAt: number;
  reviewedAt?: number;
  consumedAt?: number;
}

export function approvalToMembership(request: WalkInApprovalRequest): CompletedMembership {
  return {
    gymId: request.gymId,
    gymName: request.gymName,
    planId: request.planId,
    planName: request.planName,
    planPrice: request.planPrice,
    coachId: request.coachId,
    coachName: request.coachName,
    coachSessionPrice: request.coachSessionPrice,
    paymentMethod: "walk-in",
    paymentRef: request.paymentRef,
    totalPaid: request.totalPaid,
    joinedAt: new Date().toISOString(),
    durationDays: request.durationDays,
  };
}

export function formatApprovalTime(timestamp: number) {
  return new Date(timestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function mapApproval(raw: any): WalkInApprovalRequest {
  return {
    id: raw.id,
    userId: raw.userId,
    memberName: raw.memberName,
    memberEmail: raw.memberEmail,
    gymId: raw.gymId,
    gymName: raw.gymName || "",
    planId: raw.planId,
    planName: raw.planName || raw.plan?.name || "",
    planPrice: raw.planPrice ?? raw.plan?.price ?? 0,
    coachId: raw.coachId ?? null,
    coachName: raw.coachName ?? null,
    coachSessionPrice: raw.coachSessionPrice ?? 0,
    paymentRef: raw.paymentRef,
    totalPaid: raw.totalPaid,
    durationDays: raw.durationDays,
    status: String(raw.status || "pending").toLowerCase() as ApprovalStatus,
    submittedAt:
      typeof raw.submittedAt === "number"
        ? raw.submittedAt
        : new Date(raw.submittedAt).getTime(),
    reviewedAt: raw.reviewedAt
      ? typeof raw.reviewedAt === "number"
        ? raw.reviewedAt
        : new Date(raw.reviewedAt).getTime()
      : undefined,
    consumedAt: raw.consumedAt
      ? typeof raw.consumedAt === "number"
        ? raw.consumedAt
        : new Date(raw.consumedAt).getTime()
      : undefined,
  };
}

interface SubmitWalkInInput {
  userId: string;
  memberName: string;
  memberEmail: string;
  membership: CompletedMembership;
  durationDays: number;
}

interface WalkInApprovalsState {
  requests: WalkInApprovalRequest[];
  loading: boolean;
  error: string | null;
  fetchApprovals: () => Promise<void>;
  submitRequest: (input: SubmitWalkInInput) => Promise<WalkInApprovalRequest | null>;
  approveRequest: (id: string) => Promise<WalkInApprovalRequest | null>;
  declineRequest: (id: string) => Promise<WalkInApprovalRequest | null>;
  fetchWalkInPayments: () => Promise<WalkInApprovalRequest[]>;
  completeWalkInPayment: (id: string) => Promise<boolean>;
  fetchUserStatus: () => Promise<void>;
  getPendingRequests: () => WalkInApprovalRequest[];
  getAwaitingPaymentRequests: () => WalkInApprovalRequest[];
  getApprovedForUser: (userId: string) => WalkInApprovalRequest | null;
  getPendingForUser: (userId: string, gymId: string) => WalkInApprovalRequest | null;
}

export const useWalkInApprovalsStore = create<WalkInApprovalsState>((set, get) => ({
  requests: [],
  loading: false,
  error: null,

  fetchApprovals: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.get("/clerk/approvals");
      if (data.success) {
        set({
          requests: (data.data || []).map(mapApproval),
          loading: false,
          error: null,
        });
      } else {
        // Empty list is a valid state — don't show a red banner for load misses
        set({ loading: false, error: null });
      }
    } catch {
      set({ loading: false, error: null });
    }
  },

  submitRequest: async (input) => {
    try {
      const { data } = await api.post("/user/join-gym", {
        gymId: input.membership.gymId,
        planId: input.membership.planId,
        coachId: input.membership.coachId,
        paymentMethod: "walk-in",
        paymentRef: input.membership.paymentRef,
        totalPaid: input.membership.totalPaid,
      });

      if (!data.success) {
        set({ error: data.message || "Failed to submit walk-in request." });
        return null;
      }

      const approval = mapApproval({
        ...data.data.approval,
        gymName: input.membership.gymName,
        planName: input.membership.planName,
        planPrice: input.membership.planPrice,
      });

      set({
        requests: [
          approval,
          ...get().requests.filter(
            (req) =>
              !(
                req.userId === input.userId &&
                req.gymId === input.membership.gymId &&
                req.status === "declined"
              ),
          ),
        ],
        error: null,
      });
      return approval;
    } catch (error: any) {
      set({
        error: error.response?.data?.message || "Failed to submit walk-in request.",
      });
      return null;
    }
  },

  approveRequest: async (id) => {
    try {
      const { data } = await api.put(`/clerk/approvals/${id}/approve`);
      if (!data.success) {
        set({ error: data.message || "Failed to approve request." });
        return null;
      }

      const updated = mapApproval(data.data);
      set({
        requests: get().requests.map((req) => (req.id === id ? { ...req, ...updated, status: "approved" } : req)),
        error: null,
      });
      return get().requests.find((req) => req.id === id) ?? updated;
    } catch (error: any) {
      set({ error: error.response?.data?.message || "Failed to approve request." });
      return null;
    }
  },

  declineRequest: async (id) => {
    try {
      const { data } = await api.put(`/clerk/approvals/${id}/decline`);
      if (!data.success) {
        set({ error: data.message || "Failed to decline request." });
        return null;
      }

      const updated: WalkInApprovalRequest = {
        ...(get().requests.find((req) => req.id === id) as WalkInApprovalRequest),
        status: "declined",
        reviewedAt: Date.now(),
      };

      set({
        requests: get().requests.map((req) => (req.id === id ? updated : req)),
        error: null,
      });
      return updated;
    } catch (error: any) {
      set({ error: error.response?.data?.message || "Failed to decline request." });
      return null;
    }
  },

  fetchWalkInPayments: async () => {
    try {
      const { data } = await api.get("/clerk/walk-in-payments");
      if (!data.success) {
        set({ error: null });
        return [];
      }
      const mapped = (data.data || []).map(mapApproval);
      // Merge into store so Approvals + Walk-in Payment stay in sync
      const byId = new Map(get().requests.map((r) => [r.id, r]));
      for (const item of mapped) byId.set(item.id, item);
      set({ requests: Array.from(byId.values()), error: null });
      return mapped;
    } catch {
      set({ error: null });
      return [];
    }
  },

  completeWalkInPayment: async (id) => {
    try {
      const { data } = await api.post(`/clerk/walk-in-payments/${id}/complete`);
      if (!data.success) {
        set({ error: data.message || "Failed to confirm payment." });
        return false;
      }

      set({
        requests: get().requests.map((req) =>
          req.id === id
            ? {
                ...req,
                consumedAt: data.data?.approval?.consumedAt ?? Date.now(),
                status: "approved",
              }
            : req,
        ),
        error: null,
      });
      return true;
    } catch (error: any) {
      set({
        error: error.response?.data?.message || "Failed to confirm payment.",
      });
      return false;
    }
  },

  fetchUserStatus: async () => {
    try {
      const { data } = await api.get("/user/walk-in-status");
      if (!data.success) return;

      const list = Array.isArray(data.data) ? data.data : data.data ? [data.data] : [];
      const mapped = list.map(mapApproval);
      if (mapped.length === 0) return;

      // Merge user-facing statuses without wiping clerk-fetched rows when both exist
      const byId = new Map(get().requests.map((r) => [r.id, r]));
      for (const item of mapped) byId.set(item.id, item);
      set({ requests: Array.from(byId.values()) });
    } catch {
      // USER may not have pending walk-ins; ignore
    }
  },

  getPendingRequests: () => get().requests.filter((req) => req.status === "pending"),

  getAwaitingPaymentRequests: () =>
    get().requests.filter((req) => req.status === "approved" && !req.consumedAt),

  getApprovedForUser: (userId) => {
    return (
      get().requests.find(
        (req) => req.userId === userId && req.status === "approved" && !req.consumedAt,
      ) ?? null
    );
  },

  getPendingForUser: (userId, gymId) => {
    return (
      get().requests.find(
        (req) => req.userId === userId && req.gymId === gymId && req.status === "pending",
      ) ?? null
    );
  },
}));

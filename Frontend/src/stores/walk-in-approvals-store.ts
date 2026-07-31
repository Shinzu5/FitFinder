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
  planId: string | null;
  planName: string;
  planPrice: number;
  coachId: string | null;
  coachName: string | null;
  coachSessionPrice: number;
  paymentRef: string;
  totalPaid: number;
  durationDays: number;
  isRenewal?: boolean;
  paymentMethod?: string;
  paymentStatus: "paid" | "pending" | string;
  approvalStatus: ApprovalStatus;
  status: ApprovalStatus;
  rejectionReason?: string;
  submittedAt: number;
  reviewedAt?: number;
  consumedAt?: number;
  renewalDate?: number;
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
  const status = String(raw.approvalStatus || raw.status || "pending").toLowerCase() as ApprovalStatus;
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
    isRenewal: Boolean(raw.isRenewal),
    paymentMethod: raw.paymentMethod || "Walk-in",
    paymentStatus: String(raw.paymentStatus || "paid").toLowerCase(),
    approvalStatus: status,
    status,
    rejectionReason: raw.rejectionReason || "",
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
    renewalDate: raw.renewalDate
      ? typeof raw.renewalDate === "number"
        ? raw.renewalDate
        : new Date(raw.renewalDate).getTime()
      : typeof raw.submittedAt === "number"
        ? raw.submittedAt
        : new Date(raw.submittedAt).getTime(),
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
  completeOnboarding: (id: string) => Promise<boolean>;
  fetchUserStatus: () => Promise<void>;
  applyRealtimeApproval: (raw: unknown) => void;
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
        planName: input.membership.planName,
        durationDays: input.durationDays,
        coachId: input.membership.coachId,
        paymentMethod: "walk-in",
        paymentRef: input.membership.paymentRef,
        totalPaid: input.membership.totalPaid,
      });

      if (!data.success) {
        set({ error: data.message || "Failed to submit walk-in request." });
        return null;
      }

      // API always returns { approval } — also accept bare approval for older responses
      const raw = data.data?.approval || data.data;
      if (!raw?.id) {
        set({ error: data.message || "Invalid walk-in response from server." });
        return null;
      }

      const approval = mapApproval({
        ...raw,
        gymName: raw.gymName || input.membership.gymName,
        planName: raw.planName || input.membership.planName,
        planPrice: raw.planPrice ?? input.membership.planPrice,
      });

      // Drop prior declines for this gym — a new submit supersedes rejection UI
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
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to submit walk-in request.",
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
      const { data } = await api.put(`/clerk/approvals/${id}/decline`, {
        reason: "Request declined by gym staff",
      });
      if (!data.success) {
        set({ error: data.message || "Failed to decline request." });
        return null;
      }

      const updated = mapApproval(data.data);
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
                approvalStatus: "approved",
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

  completeOnboarding: async (id) => {
    try {
      const { data } = await api.post(`/user/walk-in-done/${id}`);
      if (!data.success) {
        set({ error: data.message || "Failed to complete onboarding." });
        return false;
      }
      const updated = mapApproval(data.data.approval || { ...data.data, id, status: "approved" });
      set({
        requests: get().requests.map((req) => (req.id === id ? { ...req, ...updated } : req)),
        error: null,
      });
      return true;
    } catch (error: any) {
      set({
        error: error.response?.data?.message || "Failed to complete onboarding.",
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

      // Hide superseded declines when a newer pending/approved request exists for same gym
      const filtered = mapped.filter((req: WalkInApprovalRequest) => {
        if (req.status !== "declined") return true;
        return !mapped.some(
          (other: WalkInApprovalRequest) =>
            other.id !== req.id &&
            other.userId === req.userId &&
            other.gymId === req.gymId &&
            other.submittedAt >= req.submittedAt &&
            (other.status === "pending" || other.status === "approved"),
        );
      });

      set({ requests: filtered });
    } catch {
      // USER may not have pending walk-ins; ignore
    }
  },

  applyRealtimeApproval: (raw) => {
    if (!raw || typeof raw !== "object") return;
    const approval = mapApproval(raw);
    let next = get().requests.filter((req) => {
      // New pending/approved submission clears older declines for that gym
      if (
        (approval.status === "pending" || approval.status === "approved") &&
        req.status === "declined" &&
        req.userId === approval.userId &&
        req.gymId === approval.gymId
      ) {
        return false;
      }
      return true;
    });
    const byId = new Map(next.map((r) => [r.id, r]));
    byId.set(approval.id, approval);
    set({ requests: Array.from(byId.values()) });
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

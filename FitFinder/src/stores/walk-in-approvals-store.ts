"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
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

function makeTimeStamp(hours: number, minutes: number) {
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d.getTime();
}

const DEFAULT_PENDING: WalkInApprovalRequest[] = [
  {
    id: "approval-1",
    userId: "user-1",
    memberName: "Member User",
    memberEmail: "member@test.com",
    gymId: "gym-1",
    gymName: "Abbsy Mini Gym",
    planId: "plan-monthly",
    planName: "Monthly",
    planPrice: 799,
    coachId: null,
    coachName: null,
    coachSessionPrice: 0,
    paymentRef: "AMG-2026-4821",
    totalPaid: 799,
    durationDays: 30,
    status: "pending",
    submittedAt: makeTimeStamp(10, 15),
  },
];

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

interface SubmitWalkInInput {
  userId: string;
  memberName: string;
  memberEmail: string;
  membership: CompletedMembership;
  durationDays: number;
}

interface WalkInApprovalsState {
  requests: WalkInApprovalRequest[];
  submitRequest: (input: SubmitWalkInInput) => WalkInApprovalRequest;
  approveRequest: (id: string) => WalkInApprovalRequest | null;
  declineRequest: (id: string) => WalkInApprovalRequest | null;
  markConsumed: (id: string) => void;
  getPendingRequests: () => WalkInApprovalRequest[];
  getApprovedForUser: (userId: string) => WalkInApprovalRequest | null;
  getPendingForUser: (userId: string, gymId: string) => WalkInApprovalRequest | null;
}

export const useWalkInApprovalsStore = create<WalkInApprovalsState>()(
  persist(
    (set, get) => ({
      requests: DEFAULT_PENDING,

      submitRequest: (input) => {
        const existingPending = get().requests.find(
          (req) =>
            req.userId === input.userId &&
            req.gymId === input.membership.gymId &&
            req.status === "pending",
        );
        if (existingPending) return existingPending;

        const request: WalkInApprovalRequest = {
          id: `approval-${Date.now()}`,
          userId: input.userId,
          memberName: input.memberName,
          memberEmail: input.memberEmail,
          gymId: input.membership.gymId,
          gymName: input.membership.gymName,
          planId: input.membership.planId,
          planName: input.membership.planName,
          planPrice: input.membership.planPrice,
          coachId: input.membership.coachId,
          coachName: input.membership.coachName,
          coachSessionPrice: input.membership.coachSessionPrice,
          paymentRef: input.membership.paymentRef,
          totalPaid: input.membership.totalPaid,
          durationDays: input.durationDays,
          status: "pending",
          submittedAt: Date.now(),
        };

        set({
          requests: [
            request,
            ...get().requests.filter(
              (req) =>
                !(
                  req.userId === input.userId &&
                  req.gymId === input.membership.gymId &&
                  req.status === "declined"
                ),
            ),
          ],
        });
        return request;
      },

      approveRequest: (id) => {
        const request = get().requests.find((req) => req.id === id);
        if (!request || request.status !== "pending") return null;

        const updated: WalkInApprovalRequest = {
          ...request,
          status: "approved",
          reviewedAt: Date.now(),
        };

        set({
          requests: get().requests.map((req) => (req.id === id ? updated : req)),
        });

        return updated;
      },

      declineRequest: (id) => {
        const request = get().requests.find((req) => req.id === id);
        if (!request || request.status !== "pending") return null;

        const updated: WalkInApprovalRequest = {
          ...request,
          status: "declined",
          reviewedAt: Date.now(),
        };

        set({
          requests: get().requests.map((req) => (req.id === id ? updated : req)),
        });

        return updated;
      },

      markConsumed: (id) => {
        set({
          requests: get().requests.map((req) =>
            req.id === id ? { ...req, consumedAt: Date.now() } : req,
          ),
        });
      },

      getPendingRequests: () => get().requests.filter((req) => req.status === "pending"),

      getApprovedForUser: (userId) => {
        return (
          get().requests.find(
            (req) =>
              req.userId === userId &&
              req.status === "approved" &&
              !req.consumedAt,
          ) ?? null
        );
      },

      getPendingForUser: (userId, gymId) => {
        return (
          get().requests.find(
            (req) =>
              req.userId === userId &&
              req.gymId === gymId &&
              req.status === "pending",
          ) ?? null
        );
      },
    }),
    {
      name: "fitfinder-walk-in-approvals",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

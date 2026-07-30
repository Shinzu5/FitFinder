"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useMembershipStore } from "@/stores/membership-store";
import { useWalkInApprovalsStore } from "@/stores/walk-in-approvals-store";

/** Polls DB for walk-in status and refreshes membership when payment is completed. */
export function useWalkInApprovalSync() {
  const user = useAuthStore((state) => state.user);
  const joinedGymId = useMembershipStore((state) => state.joinedGymId);
  const fetchMembership = useMembershipStore((state) => state.fetchMembership);
  const fetchUserStatus = useWalkInApprovalsStore((state) => state.fetchUserStatus);
  const requests = useWalkInApprovalsStore((state) => state.requests);

  useEffect(() => {
    if (!user?.id) return;
    void fetchMembership();
    void fetchUserStatus();
  }, [user?.id, fetchMembership, fetchUserStatus]);

  useEffect(() => {
    if (!user?.id || joinedGymId) return;

    // Membership unlocks only after clerk Done (consumedAt), not on Approve alone.
    const paid = requests.some(
      (req) => req.userId === user.id && req.status === "approved" && Boolean(req.consumedAt),
    );
    if (!paid) return;

    void fetchMembership();
  }, [user?.id, joinedGymId, requests, fetchMembership]);

  useEffect(() => {
    if (!user?.id || joinedGymId) return;
    const id = window.setInterval(() => {
      void fetchUserStatus();
      void fetchMembership();
    }, 5000);
    return () => window.clearInterval(id);
  }, [user?.id, joinedGymId, fetchUserStatus, fetchMembership]);
}

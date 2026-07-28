"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useMembershipStore } from "@/stores/membership-store";
import {
  approvalToMembership,
  useWalkInApprovalsStore,
} from "@/stores/walk-in-approvals-store";

export function useWalkInApprovalSync() {
  const user = useAuthStore((state) => state.user);
  const joinedGymId = useMembershipStore((state) => state.joinedGymId);
  const joinGym = useMembershipStore((state) => state.joinGym);
  const requests = useWalkInApprovalsStore((state) => state.requests);
  const markConsumed = useWalkInApprovalsStore((state) => state.markConsumed);

  useEffect(() => {
    if (!user?.id || joinedGymId) return;

    const approved = requests.find(
      (req) => req.userId === user.id && req.status === "approved" && !req.consumedAt,
    );
    if (!approved) return;

    joinGym(approvalToMembership(approved));
    markConsumed(approved.id);
  }, [user?.id, joinedGymId, requests, joinGym, markConsumed]);
}

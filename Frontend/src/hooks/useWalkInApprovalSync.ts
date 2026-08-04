"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useMembershipStore } from "@/stores/membership-store";
import { useWalkInApprovalsStore } from "@/stores/walk-in-approvals-store";
import { getSocket } from "@/lib/socket";

/** Syncs walk-in approval + membership via Socket.IO, with a slow poll fallback. */
export function useWalkInApprovalSync() {
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const joinedGymId = useMembershipStore((state) => state.joinedGymId);
  const fetchMembership = useMembershipStore((state) => state.fetchMembership);
  const fetchUserStatus = useWalkInApprovalsStore((state) => state.fetchUserStatus);
  const applyRealtimeApproval = useWalkInApprovalsStore(
    (state) => state.applyRealtimeApproval,
  );
  const requests = useWalkInApprovalsStore((state) => state.requests);

  useEffect(() => {
    if (!user?.id) return;
    void fetchMembership();
    void fetchUserStatus();
  }, [user?.id, fetchMembership, fetchUserStatus]);

  // When staff completes activation, approved+consumed requests must unlock via membership fetch
  useEffect(() => {
    if (!user?.id || joinedGymId) return;

    const activated = requests.some(
      (req) =>
        req.userId === user.id &&
        req.status === "approved" &&
        Boolean(req.consumedAt),
    );
    if (!activated) return;

    void fetchMembership();
  }, [user?.id, joinedGymId, requests, fetchMembership]);

  // Realtime only — no polling
  useEffect(() => {
    if (!user?.id || !accessToken) return;

    const socket = getSocket(accessToken);

    function onWalkInStatus(payload: { approval?: unknown }) {
      if (payload?.approval) {
        applyRealtimeApproval(payload.approval);
      } else {
        void fetchUserStatus();
      }
      // Pending must not unlock — GET /membership returns null until ACTIVE exists
      void fetchMembership();
    }

    function onMembershipUpdated() {
      void fetchMembership();
      void fetchUserStatus();
    }

    function onActiveGymChanged() {
      void fetchMembership();
    }

    function onApprovalsUpdated() {
      const role = useAuthStore.getState().role;
      if (role === "OWNER" || role === "CLERK") {
        void useWalkInApprovalsStore.getState().fetchApprovals();
      }
    }

    socket.on("walk_in_status", onWalkInStatus);
    socket.on("membership_updated", onMembershipUpdated);
    socket.on("active_gym_changed", onActiveGymChanged);
    socket.on("walk_in_approvals_updated", onApprovalsUpdated);

    return () => {
      socket.off("walk_in_status", onWalkInStatus);
      socket.off("membership_updated", onMembershipUpdated);
      socket.off("active_gym_changed", onActiveGymChanged);
      socket.off("walk_in_approvals_updated", onApprovalsUpdated);
    };
  }, [
    user?.id,
    accessToken,
    applyRealtimeApproval,
    fetchMembership,
    fetchUserStatus,
  ]);

  // Revoke gym access automatically at expiresAt without a manual refresh
  const membership = useMembershipStore((state) => state.membership);
  useEffect(() => {
    if (!user?.id || !membership?.expiresAt) return;
    const ms = new Date(membership.expiresAt).getTime() - Date.now();
    if (ms <= 0) {
      void fetchMembership();
      return;
    }
    const id = window.setTimeout(() => {
      void fetchMembership();
    }, Math.min(ms + 250, 2_147_000_000));
    return () => window.clearTimeout(id);
  }, [user?.id, membership?.expiresAt, fetchMembership]);
}

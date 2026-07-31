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

  useEffect(() => {
    if (!user?.id || joinedGymId) return;

    const approved = requests.some(
      (req) => req.userId === user.id && req.status === "approved",
    );
    if (!approved) return;

    void fetchMembership();
  }, [user?.id, joinedGymId, requests, fetchMembership]);

  // Primary: realtime socket events
  useEffect(() => {
    if (!user?.id || !accessToken) return;

    const socket = getSocket(accessToken);

    function onWalkInStatus(payload: { approval?: unknown }) {
      if (payload?.approval) {
        applyRealtimeApproval(payload.approval);
      } else {
        void fetchUserStatus();
      }
      void fetchMembership();
    }

    function onMembershipUpdated() {
      void fetchMembership();
      void fetchUserStatus();
    }

    function onApprovalsUpdated() {
      // Owner/Clerk badge + list — USER can ignore; store handles both roles
      const role = useAuthStore.getState().role;
      if (role === "OWNER" || role === "CLERK") {
        void useWalkInApprovalsStore.getState().fetchApprovals();
      }
    }

    socket.on("walk_in_status", onWalkInStatus);
    socket.on("membership_updated", onMembershipUpdated);
    socket.on("walk_in_approvals_updated", onApprovalsUpdated);

    return () => {
      socket.off("walk_in_status", onWalkInStatus);
      socket.off("membership_updated", onMembershipUpdated);
      socket.off("walk_in_approvals_updated", onApprovalsUpdated);
    };
  }, [
    user?.id,
    accessToken,
    applyRealtimeApproval,
    fetchMembership,
    fetchUserStatus,
  ]);

  // Slow fallback poll only while waiting (no membership yet)
  useEffect(() => {
    if (!user?.id || joinedGymId) return;
    const id = window.setInterval(() => {
      void fetchUserStatus();
      void fetchMembership();
    }, 30000);
    return () => window.clearInterval(id);
  }, [user?.id, joinedGymId, fetchUserStatus, fetchMembership]);
}

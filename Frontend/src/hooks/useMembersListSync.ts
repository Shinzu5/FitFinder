"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useOwnerMembersStore } from "@/stores/owner-members-store";
import { useOwnerStaffStore } from "@/stores/owner-staff-store";
import { useClerkStore } from "@/stores/clerk-store";
import { getSocket } from "@/lib/socket";

/**
 * Keeps Owner + Clerk Members lists in sync via Socket.IO `members_updated`.
 * Owner also refreshes Front Desk Staff + dashboard active-member count.
 * No polling / reload — fetch only on event.
 */
export function useMembersListSync() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const role = useAuthStore((state) => state.role);
  const fetchOwnerMembers = useOwnerMembersStore((state) => state.fetchMembers);
  const fetchStaff = useOwnerStaffStore((state) => state.fetchStaff);
  const fetchClerkMembers = useClerkStore((state) => state.fetchMembers);
  const fetchClerkDashboard = useClerkStore((state) => state.fetchDashboard);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;
    if (role !== "OWNER" && role !== "CLERK") return;

    if (role === "OWNER") {
      void fetchOwnerMembers({ silent: true });
      void fetchStaff();
    }
    if (role === "CLERK") void fetchClerkMembers();

    const socket = getSocket(accessToken);

    function onMembersUpdated() {
      if (role === "OWNER") {
        void fetchOwnerMembers({ silent: true });
        void fetchStaff();
      }
      if (role === "CLERK") void fetchClerkMembers();
      // Active Members card on Owner Overview uses dashboard.activeNow
      void fetchClerkDashboard();
    }

    socket.on("members_updated", onMembersUpdated);
    return () => {
      socket.off("members_updated", onMembersUpdated);
    };
  }, [
    accessToken,
    isAuthenticated,
    role,
    fetchOwnerMembers,
    fetchStaff,
    fetchClerkMembers,
    fetchClerkDashboard,
  ]);
}

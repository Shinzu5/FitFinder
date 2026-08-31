"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { getSocket } from "@/lib/socket";
import {
  type MembershipPlanOption,
  useClerkStore,
} from "@/stores/clerk-store";

interface PlansUpdatedPayload {
  gymId?: string;
  plans?: MembershipPlanOption[];
}

/**
 * Keeps Clerk membership plans in sync with Owner plan CRUD via Socket.IO.
 * Reuses the shared dashboard socket — no polling, no duplicate connections.
 */
export function useClerkMembershipPlansSync() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const role = useAuthStore((state) => state.role);
  const fetchPlans = useClerkStore((state) => state.fetchPlans);
  const setPlans = useClerkStore((state) => state.setPlans);

  useEffect(() => {
    if (!isAuthenticated || !accessToken || role !== "CLERK") return;

    void fetchPlans();

    const socket = getSocket(accessToken);

    function onPlansUpdated(payload: PlansUpdatedPayload) {
      if (Array.isArray(payload?.plans)) {
        setPlans(payload.plans);
        return;
      }
      void fetchPlans();
    }

    socket.on("membership_plans_updated", onPlansUpdated);
    return () => {
      socket.off("membership_plans_updated", onPlansUpdated);
    };
  }, [accessToken, isAuthenticated, role, fetchPlans, setPlans]);
}

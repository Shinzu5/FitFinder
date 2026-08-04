"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useClerkStore } from "@/stores/clerk-store";
import { useAttendanceStore } from "@/stores/attendance-store";
import { useMembershipStore } from "@/stores/membership-store";
import { getSocket } from "@/lib/socket";

interface AttendanceUpdatedPayload {
  gymId?: string;
  activeNow?: number;
}

/**
 * Realtime attendance / Active Now sync for Owner, Clerk, and Gymers.
 */
export function useAttendanceSync() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.role);
  const fetchDashboard = useClerkStore((s) => s.fetchDashboard);
  const setClerkActiveNow = useClerkStore((s) => s.setActiveNow);
  const fetchAttendance = useAttendanceStore((s) => s.fetchAttendance);
  const setAttendanceActiveNow = useAttendanceStore((s) => s.setActiveNow);
  const joinedGymId = useMembershipStore((s) => s.joinedGymId);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;

    const socket = getSocket(accessToken);

    function onAttendanceUpdated(payload: AttendanceUpdatedPayload) {
      if (typeof payload?.activeNow === "number") {
        setAttendanceActiveNow(payload.activeNow);
        if (role === "OWNER" || role === "CLERK") {
          setClerkActiveNow(payload.activeNow);
        }
      }

      if (role === "OWNER" || role === "CLERK") {
        void fetchAttendance({ silent: true });
        void fetchDashboard();
      }

      // Gymer Home: per-gym Active Now cards (any gym room this socket joined)
      if (role === "USER" && payload?.gymId && typeof payload.activeNow === "number") {
        window.dispatchEvent(
          new CustomEvent("fitfinder:active-now", {
            detail: { gymId: payload.gymId, activeNow: payload.activeNow },
          }),
        );
      }
    }

    socket.on("attendance_updated", onAttendanceUpdated);

    if (role === "USER" && joinedGymId) {
      socket.emit("join_gym", joinedGymId);
    }

    return () => {
      socket.off("attendance_updated", onAttendanceUpdated);
    };
  }, [
    accessToken,
    isAuthenticated,
    role,
    joinedGymId,
    fetchAttendance,
    fetchDashboard,
    setAttendanceActiveNow,
    setClerkActiveNow,
  ]);
}

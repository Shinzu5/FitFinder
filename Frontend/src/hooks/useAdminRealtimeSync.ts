"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { getSocket } from "@/lib/socket";

/** Refresh admin panels when backend emits `admin_gyms_updated` (no page reload). */
export function useAdminRealtimeSync(onUpdate: () => void) {
  const accessToken = useAuthStore((state) => state.accessToken);

  useEffect(() => {
    if (!accessToken) return;
    const socket = getSocket(accessToken);
    const handler = () => onUpdate();
    socket.on("admin_gyms_updated", handler);
    return () => {
      socket.off("admin_gyms_updated", handler);
    };
  }, [accessToken, onUpdate]);
}

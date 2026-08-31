"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { useCreateGymStore } from "@/stores/create-gym-store";
import { disconnectSocket, getSocket } from "@/lib/socket";

const DEFAULT_MESSAGE = "Your account has been removed. Please sign in again.";

/**
 * When Admin/Owner deletes this account, backend emits `account_deleted`.
 * Clear local session immediately and send them to login with a notice.
 */
export function useAccountDeletedSync() {
  const router = useRouter();
  const accessToken = useAuthStore((state) => state.accessToken);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;

    const socket = getSocket(accessToken);

    function onAccountDeleted(payload?: { message?: string }) {
      const message =
        typeof payload?.message === "string" && payload.message.trim()
          ? payload.message.trim()
          : DEFAULT_MESSAGE;

      try {
        useCreateGymStore.getState().resetFlow();
      } catch {
        // ignore
      }

      disconnectSocket();
      useAuthStore.getState().clearSession();

      if (typeof window !== "undefined") {
        sessionStorage.setItem("fitfinder-account-removed", message);
      }

      router.replace(`/login?removed=1`);
    }

    socket.on("account_deleted", onAccountDeleted);
    return () => {
      socket.off("account_deleted", onAccountDeleted);
    };
  }, [accessToken, isAuthenticated, router]);
}

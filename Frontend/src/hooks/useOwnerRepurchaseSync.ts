"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { useCreateGymStore } from "@/stores/create-gym-store";
import { clearOwnerGymLocalState } from "@/lib/clear-owner-gym-state";
import { getSocket } from "@/lib/socket";

const CREATE_GYM_PREFIX = "/dashboard/user/create-gym";

/**
 * When admin/owner deletes the last gym, backend wipes the plan and emits
 * `owner_must_repurchase` — clear gym client state and send owner to plan payment.
 */
export function useOwnerRepurchaseSync() {
  const router = useRouter();
  const accessToken = useAuthStore((state) => state.accessToken);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;

    const socket = getSocket(accessToken);

    function onGymCleared() {
      clearOwnerGymLocalState();
    }

    function onMustRepurchase() {
      clearOwnerGymLocalState();
      useCreateGymStore.getState().resetFlow();
      useAuthStore.getState().demoteToUser();
      router.replace(CREATE_GYM_PREFIX);
    }

    socket.on("owner_gym_cleared", onGymCleared);
    socket.on("owner_must_repurchase", onMustRepurchase);
    return () => {
      socket.off("owner_gym_cleared", onGymCleared);
      socket.off("owner_must_repurchase", onMustRepurchase);
    };
  }, [accessToken, isAuthenticated, router]);
}

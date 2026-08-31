"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useMembershipStore } from "@/stores/membership-store";
import { useMemberGymContentStore } from "@/stores/member-gym-content-store";
import { getSocket } from "@/lib/socket";

/**
 * Joins the member's gym Socket.IO room and applies Owner shop/equipment
 * updates live — no polling, no reload.
 */
export function useMemberGymContentSync() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const role = useAuthStore((state) => state.role);
  const joinedGymId = useMembershipStore((state) => state.joinedGymId);
  const setEquipmentFromRealtime = useMemberGymContentStore(
    (state) => state.setEquipmentFromRealtime,
  );
  const setShopFromRealtime = useMemberGymContentStore((state) => state.setShopFromRealtime);
  const fetchEquipment = useMemberGymContentStore((state) => state.fetchEquipment);
  const fetchShop = useMemberGymContentStore((state) => state.fetchShop);

  useEffect(() => {
    if (role !== "USER" || !accessToken || !joinedGymId) return;

    void fetchEquipment();
    void fetchShop();

    const socket = getSocket(accessToken);
    socket.emit("join_gym", joinedGymId);

    function onEquipmentUpdated(payload: { gymId?: string; equipment?: unknown[] }) {
      if (!payload?.gymId || payload.gymId !== joinedGymId) return;
      if (Array.isArray(payload.equipment)) {
        setEquipmentFromRealtime(payload.equipment);
        return;
      }
      void fetchEquipment();
    }

    function onShopUpdated(payload: { gymId?: string; products?: unknown[] }) {
      if (!payload?.gymId || payload.gymId !== joinedGymId) return;
      if (Array.isArray(payload.products)) {
        setShopFromRealtime(payload.products);
        return;
      }
      void fetchShop();
    }

    socket.on("equipment_updated", onEquipmentUpdated);
    socket.on("shop_updated", onShopUpdated);

    return () => {
      socket.emit("leave_gym", joinedGymId);
      socket.off("equipment_updated", onEquipmentUpdated);
      socket.off("shop_updated", onShopUpdated);
    };
  }, [
    role,
    accessToken,
    joinedGymId,
    fetchEquipment,
    fetchShop,
    setEquipmentFromRealtime,
    setShopFromRealtime,
  ]);
}

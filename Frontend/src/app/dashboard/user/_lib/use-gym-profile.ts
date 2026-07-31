"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { useOwnerCoachesStore } from "@/stores/owner-coaches-store";
import { useOwnerEquipmentStore } from "@/stores/owner-equipment-store";
import { useOwnerMembershipPlansStore } from "@/stores/owner-membership-plans-store";
import { getSocket } from "@/lib/socket";
import { resolveGymProfile } from "./gym-profile";
import type { PublicGymProfile } from "./gym-profile";

/**
 * Loads a public gym profile from the API (ACTIVE gyms only).
 * Subscribes to Socket.IO `coaches_updated` so coach CRUD is live without refresh.
 */
export function useGymProfile(gymId: string): {
  profile: PublicGymProfile | null;
  loading: boolean;
} {
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const ownerPlans = useOwnerMembershipPlansStore((state) => state.plans);
  const ownerCoaches = useOwnerCoachesStore((state) => state.coaches);
  const ownerEquipment = useOwnerEquipmentStore((state) => state.equipment);

  const [realGym, setRealGym] = useState<any>(null);
  const [loading, setLoading] = useState(Boolean(gymId));

  useEffect(() => {
    let cancelled = false;

    async function fetchGym() {
      if (!gymId) {
        setRealGym(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { data } = await api.get(`/gyms/${gymId}`);
        if (cancelled) return;
        setRealGym(data.success ? data.data : null);
      } catch {
        if (!cancelled) setRealGym(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchGym();
    return () => {
      cancelled = true;
    };
  }, [gymId]);

  useEffect(() => {
    if (!gymId || !accessToken) return;

    const socket = getSocket(accessToken);
    socket.emit("join_gym", gymId);

    function onCoachesUpdated(payload: { gymId?: string; coaches?: unknown[] }) {
      if (!payload?.gymId || payload.gymId !== gymId) return;
      if (!Array.isArray(payload.coaches)) return;
      setRealGym((prev: any) =>
        prev && prev.id === gymId ? { ...prev, coaches: payload.coaches } : prev,
      );
    }

    socket.on("coaches_updated", onCoachesUpdated);

    return () => {
      socket.emit("leave_gym", gymId);
      socket.off("coaches_updated", onCoachesUpdated);
    };
  }, [gymId, accessToken]);

  const profile = useMemo(
    () =>
      resolveGymProfile({
        gymId,
        realGym,
        ownerName: user?.fullName ?? "Gym Owner",
        ownerAvatarUrl: user?.avatarUrl,
        ownerPlans,
        ownerCoaches,
        ownerEquipment,
      }),
    [
      gymId,
      realGym,
      user?.fullName,
      user?.avatarUrl,
      ownerPlans,
      ownerCoaches,
      ownerEquipment,
    ],
  );

  return { profile, loading };
}

export function getPlanSubtitle(planName: string) {
  const normalized = planName.toLowerCase();
  if (normalized.includes("month")) return "Billed every month";
  if (normalized.includes("quarter")) return "Every 3 months";
  if (normalized.includes("annual") || normalized.includes("year")) {
    return "Best value — save 20%";
  }
  return "Gym membership access";
}

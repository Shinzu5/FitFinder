"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { getSocket } from "@/lib/socket";
import { resolveGymProfile } from "./gym-profile";
import type { GymApiPayload, PublicGymProfile } from "./gym-profile";

/**
 * Loads a public gym profile from Neon (ACTIVE gyms only).
 * Live updates for coaches + membership plans via Socket.IO — no polling.
 */
export function useGymProfile(gymId: string): {
  profile: PublicGymProfile | null;
  loading: boolean;
} {
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);

  const [realGym, setRealGym] = useState<GymApiPayload | null>(null);
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
        setRealGym(data.success ? (data.data as GymApiPayload) : null);
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
      setRealGym((prev) =>
        prev && prev.id === gymId ? { ...prev, coaches: payload.coaches as GymApiPayload["coaches"] } : prev,
      );
    }

    function onPlansUpdated(payload: {
      gymId?: string;
      plans?: Array<{
        id: string;
        label?: string;
        name?: string;
        price: number;
        durationDays: number;
      }>;
    }) {
      if (!payload?.gymId || payload.gymId !== gymId) return;
      if (!Array.isArray(payload.plans)) return;
      setRealGym((prev) =>
        prev && prev.id === gymId
          ? {
              ...prev,
              membershipPlans: payload.plans!.map((p) => ({
                id: p.id,
                name: p.label || p.name || "Plan",
                price: p.price,
                durationDays: p.durationDays,
              })),
            }
          : prev,
      );
    }

    function onEquipmentUpdated(payload: { gymId?: string; equipment?: unknown[] }) {
      if (!payload?.gymId || payload.gymId !== gymId) return;
      if (!Array.isArray(payload.equipment)) return;
      setRealGym((prev) =>
        prev && prev.id === gymId
          ? { ...prev, equipment: payload.equipment as GymApiPayload["equipment"] }
          : prev,
      );
    }

    socket.on("coaches_updated", onCoachesUpdated);
    socket.on("membership_plans_updated", onPlansUpdated);
    socket.on("equipment_updated", onEquipmentUpdated);

    return () => {
      socket.emit("leave_gym", gymId);
      socket.off("coaches_updated", onCoachesUpdated);
      socket.off("membership_plans_updated", onPlansUpdated);
      socket.off("equipment_updated", onEquipmentUpdated);
    };
  }, [gymId, accessToken]);

  const profile = useMemo(
    () =>
      resolveGymProfile({
        gymId,
        realGym,
        ownerName: user?.fullName ?? "Gym Owner",
        ownerAvatarUrl: user?.avatarUrl,
      }),
    [gymId, realGym, user?.fullName, user?.avatarUrl],
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

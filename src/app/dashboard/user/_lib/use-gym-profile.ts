"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { useCreateGymStore } from "@/stores/create-gym-store";
import { mockGyms } from "@/lib/mock-gyms";
import { useOwnerCoachesStore } from "@/stores/owner-coaches-store";
import { useOwnerEquipmentStore } from "@/stores/owner-equipment-store";
import { useOwnerMembershipPlansStore } from "@/stores/owner-membership-plans-store";
import { registeredGymToListItem, resolveGymProfile } from "./gym-profile";
import type { PublicGymProfile } from "./gym-profile";

export function useGymProfile(gymId: string): PublicGymProfile | null {
  const user = useAuthStore((state) => state.user);
  const registeredGym = useCreateGymStore((state) => state.registeredGym);
  const ownerPlans = useOwnerMembershipPlansStore((state) => state.plans);
  const ownerCoaches = useOwnerCoachesStore((state) => state.coaches);
  const ownerEquipment = useOwnerEquipmentStore((state) => state.equipment);

  const mockGym = useMemo(() => {
    const fromMock = mockGyms.find((gym) => gym.id === gymId);
    if (fromMock) return fromMock;
    if (registeredGym?.id === gymId) return registeredGymToListItem(registeredGym);
    return undefined;
  }, [gymId, registeredGym]);

  return useMemo(
    () =>
      resolveGymProfile({
        gymId,
        mockGym,
        registeredGym,
        ownerName: user?.fullName ?? "Gym Owner",
        ownerAvatarUrl: user?.avatarUrl,
        ownerPlans,
        ownerCoaches,
        ownerEquipment,
      }),
    [
      gymId,
      mockGym,
      registeredGym,
      user?.fullName,
      user?.avatarUrl,
      ownerPlans,
      ownerCoaches,
      ownerEquipment,
    ],
  );
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

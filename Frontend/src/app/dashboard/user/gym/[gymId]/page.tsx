"use client";

import { useMemo, useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { useCreateGymStore } from "@/stores/create-gym-store";
import { mockGyms } from "@/lib/mock-gyms";
import { useOwnerCoachesStore } from "@/stores/owner-coaches-store";
import { useOwnerEquipmentStore } from "@/stores/owner-equipment-store";
import { useOwnerMembershipPlansStore } from "@/stores/owner-membership-plans-store";
import { GymProfileView } from "../../_components/GymProfileView";
import { registeredGymToListItem, resolveGymProfile } from "../../_lib/gym-profile";

export default function UserGymProfilePage() {
  const params = useParams();
  const gymId = typeof params.gymId === "string" ? params.gymId : "";

  const user = useAuthStore((state) => state.user);
  const registeredGym = useCreateGymStore((state) => state.registeredGym);
  const ownerPlans = useOwnerMembershipPlansStore((state) => state.plans);
  const ownerCoaches = useOwnerCoachesStore((state) => state.coaches);
  const ownerEquipment = useOwnerEquipmentStore((state) => state.equipment);

  const [realGym, setRealGym] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGym() {
      try {
        const { data } = await api.get(`/gyms/${gymId}`);
        if (data.success) {
          setRealGym(data.data);
        }
      } catch (error) {
        // Will fallback to mockGym or registeredGym if it fails
      } finally {
        setLoading(false);
      }
    }
    if (gymId) {
      fetchGym();
    } else {
      setLoading(false);
    }
  }, [gymId]);

  const mockGym = useMemo(() => {
    const fromMock = mockGyms.find((gym) => gym.id === gymId);
    if (fromMock) return fromMock;
    if (registeredGym?.id === gymId) return registeredGymToListItem(registeredGym);
    return undefined;
  }, [gymId, registeredGym]);

  const profile = useMemo(
    () =>
      resolveGymProfile({
        gymId,
        mockGym,
        registeredGym,
        realGym,
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
      realGym,
      user?.fullName,
      user?.avatarUrl,
      ownerPlans,
      ownerCoaches,
      ownerEquipment,
    ],
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#FACC15] border-t-transparent"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#141414] p-8 text-center">
          <p className="text-lg font-semibold text-white">Gym not found</p>
          <p className="mt-2 text-sm text-zinc-400">
            This gym may have been removed or is no longer available.
          </p>
          <Link
            href="/dashboard/user"
            className="mt-6 inline-flex rounded-lg bg-[#FACC15] px-4 py-2 text-sm font-semibold text-black hover:bg-[#e6c200]"
          >
            Back to gyms
          </Link>
        </div>
      </div>
    );
  }

  return <GymProfileView profile={profile} />;
}

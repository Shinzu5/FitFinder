"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Plus } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { useCreateGymStore } from "@/stores/create-gym-store";
import { useMembershipStore } from "@/stores/membership-store";
import { mockGyms } from "@/lib/mock-gyms";
import { registeredGymToListItem } from "./_lib/gym-profile";
import { UserGymCard } from "./_components/UserGymCard";

function getFirstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

export default function UserDashboardPage() {
  const { user } = useAuthStore();
  const registeredGym = useCreateGymStore((state) => state.registeredGym);
  const { joinedGymId, membership } = useMembershipStore();
  const firstName = getFirstName(user?.fullName ?? "Member");
  const hasMembership = Boolean(joinedGymId);

  const availableGyms = useMemo(() => {
    const gyms = [...mockGyms];
    if (registeredGym && !gyms.some((gym) => gym.id === registeredGym.id)) {
      gyms.unshift(registeredGymToListItem(registeredGym));
    }
    if (joinedGymId) {
      return gyms.sort((a, b) => {
        if (a.id === joinedGymId) return -1;
        if (b.id === joinedGymId) return 1;
        return 0;
      });
    }
    return gyms;
  }, [registeredGym, joinedGymId]);

  const joinedGymName =
    membership?.gymName ?? availableGyms.find((gym) => gym.id === joinedGymId)?.name ?? "your gym";

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Welcome back, {firstName} 🤝
          </h1>
          <p className="mt-2 text-sm text-zinc-500 sm:text-base">
            {hasMembership
              ? `You're a member of ${joinedGymName}.`
              : "Browse gyms below, or create your own."}
          </p>
        </div>
        {!hasMembership ? (
          <Link
            href="/dashboard/user/create-gym"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FACC15] px-4 py-2.5 text-sm font-bold text-black transition hover:bg-[#e6c200]"
          >
            <Plus className="h-4 w-4" />
            Create a Gym
          </Link>
        ) : null}
      </div>

      <section>
        <h2 className="mb-5 text-lg font-bold text-white">Available Gyms</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {availableGyms.map((gym) => (
            <UserGymCard key={gym.id} gym={gym} isJoined={joinedGymId === gym.id} />
          ))}
        </div>
      </section>
    </div>
  );
}

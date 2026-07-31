"use client";

import Link from "next/link";
import { useMemo, useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { Plus } from "lucide-react";
import type { Gym } from "@/lib/mock-gyms";
import { resolveMediaUrl } from "@/lib/media";
import { useAuthStore } from "@/stores/auth-store";
import { useMembershipStore } from "@/stores/membership-store";
import { getSocket } from "@/lib/socket";
import { UserGymCard } from "./_components/UserGymCard";

function getFirstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

function mapApiGymToListItem(gym: any): Gym {
  const hasActivePlans =
    typeof gym.hasActivePlans === "boolean"
      ? gym.hasActivePlans
      : gym.pricePerMonth != null;
  return {
    id: gym.id,
    name: gym.name,
    location: gym.location || gym.address || "",
    description: gym.description || "",
    hours: gym.hours || gym.schedule || "",
    website: gym.website || "",
    members: gym.members ?? 0,
    pricePerMonth: hasActivePlans ? Number(gym.pricePerMonth) : null,
    hasActivePlans,
    image: resolveMediaUrl(gym.image || gym.coverImageUrl),
    status: "ACTIVE",
  };
}

export default function UserDashboardPage() {
  const { user } = useAuthStore();
  const { joinedGymId, membership, fetchMembership } = useMembershipStore();
  const firstName = getFirstName(user?.fullName ?? "Member");
  const hasMembership = Boolean(joinedGymId);

  const [realGyms, setRealGyms] = useState<Gym[]>([]);
  const [loadingGyms, setLoadingGyms] = useState(true);

  useEffect(() => {
    void fetchMembership();
  }, [fetchMembership]);

  const fetchGyms = useCallback(async () => {
    try {
      const { data } = await api.get("/gyms");
      if (data.success) {
        setRealGyms((data.data || []).map(mapApiGymToListItem));
      }
    } catch (error) {
      console.error("Failed to fetch real gyms:", error);
    } finally {
      setLoadingGyms(false);
    }
  }, []);

  useEffect(() => {
    void fetchGyms();
    const onFocus = () => void fetchGyms();
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchGyms]);

  // Plan add/edit/delete → home cards update (starting price / join availability)
  const accessToken = useAuthStore((state) => state.accessToken);
  useEffect(() => {
    if (!accessToken) return;
    const socket = getSocket(accessToken);

    function onCatalogUpdated(payload: {
      gymId?: string;
      hasActivePlans?: boolean;
      startingPrice?: number | null;
    }) {
      if (!payload?.gymId) return;
      setRealGyms((prev) =>
        prev.map((gym) =>
          gym.id === payload.gymId
            ? {
                ...gym,
                hasActivePlans: Boolean(payload.hasActivePlans),
                pricePerMonth:
                  payload.hasActivePlans && payload.startingPrice != null
                    ? Number(payload.startingPrice)
                    : null,
              }
            : gym,
        ),
      );
    }

    socket.on("gym_plans_catalog_updated", onCatalogUpdated);
    return () => {
      socket.off("gym_plans_catalog_updated", onCatalogUpdated);
    };
  }, [accessToken]);

  const availableGyms = useMemo(() => {
    const gyms = [...realGyms];
    if (joinedGymId) {
      return gyms.sort((a, b) => {
        if (a.id === joinedGymId) return -1;
        if (b.id === joinedGymId) return 1;
        return 0;
      });
    }
    return gyms;
  }, [realGyms, joinedGymId]);

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
              ? `You're a member of ${joinedGymName}.${
                  membership?.coachName
                    ? ` Your coach is ${membership.coachName}.`
                    : ""
                }`
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
        {loadingGyms && availableGyms.length === 0 ? (
          <p className="text-sm text-zinc-500">Loading gyms…</p>
        ) : availableGyms.length === 0 ? (
          <p className="text-sm text-zinc-500">No approved gyms available yet.</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {availableGyms.map((gym) => (
              <UserGymCard key={gym.id} gym={gym} isJoined={joinedGymId === gym.id} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

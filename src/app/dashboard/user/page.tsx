"use client";

import Link from "next/link";
import {
  Clock,
  Globe,
  MapPin,
  Plus,
  Users,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { useMembershipStore } from "@/stores/membership-store";
import { mockGyms } from "@/lib/mock-gyms";

function getFirstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

export default function UserDashboardPage() {
  const { user } = useAuthStore();
  const { joinedGymId, joinGym } = useMembershipStore();
  const firstName = getFirstName(user?.fullName ?? "Member");

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Welcome back, {firstName}
          </h1>
          <p className="mt-2 text-sm text-zinc-400 sm:text-base">
            Browse gyms below, or create your own.
          </p>
        </div>
        <Link
          href="/signup?role=OWNER"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#FFD700] px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-[#e6c200]"
        >
          <Plus className="h-4 w-4" />
          Create a Gym
        </Link>
      </div>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-white">Available Gyms</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {mockGyms.map((gym) => {
            const isJoined = joinedGymId === gym.id;

            return (
              <article
                key={gym.id}
                className="overflow-hidden rounded-2xl border border-white/10 bg-[#111111]"
              >
                <div className="relative h-44 w-full overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={gym.image}
                    alt={gym.name}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3">
                    <h3 className="text-lg font-semibold text-white">{gym.name}</h3>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-300">
                      <MapPin className="h-3.5 w-3.5 text-[#FFD700]" />
                      {gym.location}
                    </p>
                  </div>
                </div>

                <div className="space-y-4 p-5">
                  <p className="text-sm leading-relaxed text-zinc-400">{gym.description}</p>

                  <div className="space-y-2 text-sm text-zinc-400">
                    <p className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-zinc-500" />
                      {gym.hours}
                    </p>
                    <p className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-zinc-500" />
                      {gym.website}
                    </p>
                    <p className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-zinc-500" />
                      {gym.members} members
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-1">
                    <p className="text-lg font-bold text-[#FFD700]">
                      {gym.pricePerMonth}
                      <span className="text-sm font-medium text-zinc-400">/mo</span>
                    </p>
                    <div className="flex items-center gap-2">
                      <a
                        href={`https://${gym.website}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#FFD700]/40 px-3 py-2 text-xs font-medium text-[#FFD700] transition hover:bg-[#FFD700]/10"
                      >
                        <Globe className="h-3.5 w-3.5" />
                        Visit Website
                      </a>
                      <button
                        type="button"
                        onClick={() => joinGym(gym.id)}
                        disabled={isJoined}
                        className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                          isJoined
                            ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                            : "border border-[#FFD700] bg-transparent text-[#FFD700] hover:bg-[#FFD700] hover:text-black"
                        }`}
                      >
                        {isJoined ? "Joined" : "Join Gym"}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

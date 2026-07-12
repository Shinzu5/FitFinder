"use client";

import Link from "next/link";
import { Clock, ExternalLink, Globe, MapPin, Users } from "lucide-react";
import { motion } from "framer-motion";
import type { Gym } from "@/lib/mock-gyms";
import { getWebsiteHref } from "../_lib/gym-profile";

interface UserGymCardProps {
  gym: Gym;
  isJoined: boolean;
}

export function UserGymCard({ gym, isJoined }: UserGymCardProps) {
  const isPending = gym.status === "PENDING";

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`overflow-hidden rounded-2xl border bg-[#0e0e10] shadow-[0_8px_32px_rgba(0,0,0,0.5)] ${
        isPending ? "border-zinc-800/50 opacity-90" : "border-zinc-800/70"
      }`}
    >
      <div className="relative h-44 w-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={gym.image} alt={gym.name} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e10] via-[#0e0e10]/40 to-transparent" />
        {isPending ? (
          <div className="absolute right-3 top-3">
            <span className="rounded-full border border-[#FACC15]/40 bg-black/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#FACC15] backdrop-blur-md">
              Pending
            </span>
          </div>
        ) : null}
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="text-base font-bold text-white">{gym.name}</h3>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-400">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-[#FACC15]" />
            {gym.location}
          </p>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <p className="text-sm leading-relaxed text-zinc-400 line-clamp-2">{gym.description}</p>

        <div className="space-y-2 text-xs text-zinc-500">
          <p className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 shrink-0 text-zinc-600" />
            {gym.hours}
          </p>
          <p className="flex items-center gap-2">
            <Globe className="h-3.5 w-3.5 shrink-0 text-zinc-600" />
            {gym.website}
          </p>
          <p className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 shrink-0 text-zinc-600" />
            {gym.members} members
          </p>
        </div>

        {isPending ? (
          <div className="flex justify-end pt-1">
            <button
              type="button"
              disabled
              className="cursor-not-allowed rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-zinc-500"
            >
              Waiting for admin approval
            </button>
          </div>
        ) : (
          <div className="flex items-end justify-between gap-3 pt-1">
            <div className="flex items-start gap-2">
              <div className="mt-1 h-9 w-1 shrink-0 rounded-full bg-[#FACC15]" />
              <div>
                <p className="text-xl font-extrabold text-[#FACC15]">
                  ₱{gym.pricePerMonth.toLocaleString()}
                  <span className="text-sm font-medium text-zinc-500"> /mo</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={getWebsiteHref(gym.website)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#FACC15]/50 px-3 py-2 text-xs font-bold text-[#FACC15] transition hover:bg-[#FACC15]/10"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Visit Website
              </a>
              {isJoined ? (
                <Link
                  href={`/dashboard/user/gym/${gym.id}`}
                  className="rounded-xl bg-[#FACC15] px-4 py-2 text-xs font-bold text-black transition hover:bg-[#e6c200]"
                >
                  My Gym
                </Link>
              ) : (
                <Link
                  href={`/dashboard/user/gym/${gym.id}`}
                  className="rounded-xl border border-[#FACC15] px-4 py-2 text-xs font-bold text-[#FACC15] transition hover:bg-[#FACC15] hover:text-black"
                >
                  Join Gym
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.article>
  );
}

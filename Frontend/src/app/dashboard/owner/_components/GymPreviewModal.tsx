"use client";

import { Clock, Globe, MapPin, Phone, Users } from "lucide-react";
import type { RegisteredGym } from "@/stores/create-gym-store";

function formatWebsiteDisplay(slug: string) {
  return slug.replace(/^https?:\/\//i, "").replace(/^@/, "") || "yourgym.com";
}

function getWebsiteHref(slug: string) {
  const clean = formatWebsiteDisplay(slug);
  return clean.startsWith("http") ? clean : `https://${clean}`;
}

interface GymPreviewModalProps {
  gym: RegisteredGym;
  onClose: () => void;
}

export function GymPreviewModal({ gym, onClose }: GymPreviewModalProps) {
  const website = formatWebsiteDisplay(gym.websiteOrSlug);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close preview"
      />
      <article className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#111111] shadow-2xl">
        <div className="relative h-44 w-full overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={gym.coverImageUrl}
            alt={gym.name}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute bottom-3 left-3 right-3">
            <h3 className="text-lg font-semibold text-white">{gym.name}</h3>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-300">
              <MapPin className="h-3.5 w-3.5 text-[#FFD700]" />
              {gym.address}
            </p>
          </div>
        </div>

        <div className="space-y-4 p-5">
          <p className="text-sm leading-relaxed text-zinc-400">{gym.description}</p>

          <div className="space-y-2 text-sm text-zinc-400">
            <p className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-zinc-500" />
              {gym.schedule}
            </p>
            <p className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-zinc-500" />
              {gym.contactNumber}
            </p>
            <p className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-zinc-500" />
              {website}
            </p>
            <p className="flex items-center gap-2">
              <Users className="h-4 w-4 text-zinc-500" />
              {gym.memberCount} members
            </p>
          </div>

          <a
            href={getWebsiteHref(gym.websiteOrSlug)}
            target="_blank"
            rel="noreferrer"
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#FFD700]/40 px-3 py-2.5 text-sm font-medium text-[#FFD700] transition hover:bg-[#FFD700]/10"
          >
            <Globe className="h-3.5 w-3.5" />
            Visit Website
          </a>

          <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-4">
            <div className="flex items-center gap-2">
              <span className="h-8 w-1 rounded-full bg-[#FFD700]" />
              <p className="text-lg font-bold text-[#FFD700]">
                ₱ {gym.membershipPrice.toLocaleString()}
                <span className="text-sm font-medium text-zinc-400">/mo</span>
              </p>
            </div>
            <button
              type="button"
              className="rounded-lg border border-[#FFD700] px-4 py-2 text-xs font-semibold text-[#FFD700]"
            >
              Join Gym
            </button>
          </div>
        </div>
      </article>
      <button
        type="button"
        onClick={onClose}
        className="relative z-10 mt-4 text-sm text-zinc-400 transition hover:text-white"
      >
        Close Preview
      </button>
    </div>
  );
}

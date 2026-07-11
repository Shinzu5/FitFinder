"use client";

import Image from "next/image";
import Link from "next/link";
import { Clock, Globe, Lock, MapPin, Users } from "lucide-react";
import { motion } from "framer-motion";

import { type Gym } from "@/stores/dashboard-store";
import { cn } from "@/lib/utils";

interface GymCardProps {
  gym: Gym;
}

export function GymCard({ gym }: GymCardProps) {
  const isPending = gym.status === "PENDING";

  // Derive a "website" slug from the gym slug
  const websiteDisplay = `${gym.slug.split("-").slice(0, 2).join("")}.gym`;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={isPending ? undefined : { y: -4, transition: { duration: 0.2 } }}
      className={cn(
        "group overflow-hidden rounded-2xl border border-zinc-800/70 bg-[#0e0e10] shadow-[0_8px_32px_rgba(0,0,0,0.6)] transition-all duration-300",
        isPending && "pointer-events-none opacity-50 grayscale",
      )}
    >
      {/* Header Image */}
      <div className="relative h-44 overflow-hidden">
        <Image
          src={gym.image}
          alt={`${gym.name} cover`}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e10] via-[#0e0e10]/30 to-transparent" />
        {isPending && (
          <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-[#FACC15] backdrop-blur-md">
            <Lock className="h-3 w-3" />
            Pending Approval
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="p-4 space-y-3">
        {/* Gym Name & Location */}
        <div>
          <h3 className="text-base font-bold text-white leading-tight">{gym.name}</h3>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500">
            <MapPin className="h-3.5 w-3.5 text-[#FACC15] shrink-0" />
            <span>{gym.location}</span>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-zinc-400 leading-relaxed line-clamp-2">
          {gym.description}
        </p>

        {/* Metadata Rows */}
        <div className="space-y-1.5 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span>Mon-Sun: 6AM – 10PM</span>
          </div>
          <div className="flex items-center gap-2">
            <Globe className="h-3.5 w-3.5 shrink-0" />
            <span>{websiteDisplay}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 shrink-0" />
            <span>{gym.memberCount.toLocaleString()} members</span>
          </div>
        </div>

        {/* Visit Website Button */}
        {!isPending && (
          <Link
            href={`/gyms/${gym.slug}`}
            className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg border border-[#FACC15]/40 bg-[#FACC15]/5 px-3 py-2 text-xs font-semibold text-[#FACC15] transition hover:bg-[#FACC15]/10 hover:border-[#FACC15]/70"
            onClick={(e) => e.stopPropagation()}
          >
            <Globe className="h-3.5 w-3.5" />
            Visit Website
          </Link>
        )}
      </div>

      {/* Footer: Price + Join Gym */}
      <div className="flex items-center justify-between border-t border-zinc-800/60 px-4 py-3">
        <span className="text-sm font-bold text-white">
          <span className="text-xs text-zinc-500 font-normal">₱</span>
          {gym.monthlyPrice.toLocaleString()}
          <span className="text-xs text-zinc-500 font-normal">/mo</span>
        </span>

        {isPending ? (
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-500 cursor-not-allowed"
          >
            <Lock className="h-3 w-3" />
            Pending
          </button>
        ) : (
          <Link
            href={`/gyms/${gym.slug}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#FACC15]/50 bg-transparent px-3 py-1.5 text-xs font-bold text-[#FACC15] transition hover:bg-[#FACC15] hover:text-black hover:border-[#FACC15]"
            onClick={(e) => e.stopPropagation()}
          >
            Join Gym
          </Link>
        )}
      </div>
    </motion.article>
  );
}

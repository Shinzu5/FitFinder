"use client";

import { CheckCircle2, MapPin, X } from "lucide-react";
import type { AdminActiveGym } from "@/stores/admin-gyms-store";

interface AdminGymViewModalProps {
  gym: AdminActiveGym | null;
  onClose: () => void;
}

export function AdminGymViewModal({ gym, onClose }: AdminGymViewModalProps) {
  if (!gym) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close gym details"
      />
      <div className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-zinc-800/70 bg-[#0e0e10] shadow-2xl">
        <div className="relative h-52 overflow-hidden sm:h-60">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={gym.imageUrl} alt={gym.name} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e10] via-[#0e0e10]/30 to-transparent" />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="absolute bottom-4 left-5 right-5">
            <h2 className="text-2xl font-bold text-white">{gym.name}</h2>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-zinc-300">
              <MapPin className="h-4 w-4 shrink-0 text-zinc-400" />
              {gym.location}
            </p>
          </div>
        </div>

        <div className="grid gap-6 p-5 sm:grid-cols-2">
          <section>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              Owner Information
            </p>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FACC15] text-sm font-bold text-black">
                {gym.ownerInitials}
              </div>
              <div>
                <p className="font-semibold text-white">{gym.ownerName}</p>
                <p className="text-sm text-zinc-500">{gym.ownerEmail}</p>
              </div>
            </div>
          </section>

          <section>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              Membership Details
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-zinc-800/80 bg-[#131315] px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                  Total Members
                </p>
                <p className="mt-1 text-2xl font-bold text-white">{gym.members}</p>
              </div>
              <div className="rounded-xl border border-zinc-800/80 bg-[#131315] px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                  Active Subs
                </p>
                <p className="mt-1 text-2xl font-bold text-white">{gym.activeSubscriptions}</p>
              </div>
            </div>
          </section>

          <section>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              Gym Status
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                Active
              </span>
              <span className="rounded-full border border-[#FACC15]/35 bg-[#FACC15]/15 px-3 py-1 text-xs font-semibold text-[#FACC15]">
                {gym.planLabel}
              </span>
            </div>
          </section>

          <section>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              Payment Setup
            </p>
            <div className="mt-3 flex items-center gap-2">
              {gym.paymentConfigured ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  <span className="text-sm font-medium text-white">Xendit Configured</span>
                </>
              ) : (
                <span className="text-sm text-zinc-500">Not configured</span>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

"use client";

import { CheckCircle2, MapPin, X } from "lucide-react";
import type { AdminActiveGym } from "@/stores/admin-gyms-store";
import { resolveMediaUrl } from "@/lib/media";

interface AdminGymViewModalProps {
  gym: AdminActiveGym | null;
  onClose: () => void;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: AdminActiveGym["status"] }) {
  if (status === "active") {
    return (
      <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
        Active
      </span>
    );
  }
  if (status === "expired") {
    return (
      <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-400">
        Expired
      </span>
    );
  }
  return (
    <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400">
      Pending
    </span>
  );
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
          <img
            src={resolveMediaUrl(gym.imageUrl)}
            alt={gym.name}
            className="h-full w-full object-cover"
          />
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
                  Remaining Days
                </p>
                <p
                  className={`mt-1 text-2xl font-bold ${
                    gym.remainingDays === null
                      ? "text-zinc-500"
                      : gym.planExpired || gym.remainingDays === 0
                        ? "text-red-400"
                        : "text-[#FACC15]"
                  }`}
                >
                  {gym.remainingDays === null
                    ? "—"
                    : gym.planExpired || gym.remainingDays === 0
                      ? "0"
                      : gym.remainingDays}
                </p>
              </div>
            </div>
          </section>

          <section>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              Owner Platform Plan
            </p>
            <div className="mt-3 space-y-3">
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={gym.status} />
                <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs font-medium text-zinc-300">
                  {gym.publishedStatus === "published" ? "Published" : gym.publishedStatus}
                </span>
                <span className="rounded-full border border-[#FACC15]/35 bg-[#FACC15]/15 px-3 py-1 text-xs font-semibold text-[#FACC15]">
                  {gym.planLabel}
                  {typeof gym.planPrice === "number"
                    ? ` · ₱${gym.planPrice.toLocaleString("en-PH")}`
                    : ""}
                  {gym.planMonths ? ` · ${gym.planMonths} days` : ""}
                </span>
              </div>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                    Start Date
                  </dt>
                  <dd className="mt-0.5 text-zinc-200">
                    {formatDate(gym.subscriptionStartDate)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                    Expiration
                  </dt>
                  <dd className="mt-0.5 text-zinc-200">
                    {formatDate(gym.subscriptionExpirationDate)}
                  </dd>
                </div>
              </dl>
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

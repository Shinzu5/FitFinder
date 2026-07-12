"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Plus } from "lucide-react";
import type { CompletedMembership } from "@/stores/join-gym-store";
import { useMembershipStore } from "@/stores/membership-store";

function getMembershipProgress(membership: CompletedMembership) {
  const durationDays = membership.durationDays ?? 30;
  const joinedAt = membership.joinedAt ? new Date(membership.joinedAt) : new Date();
  const elapsedMs = Date.now() - joinedAt.getTime();
  const elapsedDays = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.max(0, durationDays - elapsedDays);
  const progressPercent = durationDays > 0 ? (daysRemaining / durationDays) * 100 : 0;

  return { daysRemaining, progressPercent, durationDays };
}

export default function MembershipPage() {
  const router = useRouter();
  const membership = useMembershipStore((state) => state.membership);
  const joinedGymId = useMembershipStore((state) => state.joinedGymId);
  const leaveGym = useMembershipStore((state) => state.leaveGym);

  if (!membership || !joinedGymId) {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold text-white">My Membership</h1>
        <div className="mt-6 rounded-2xl border border-zinc-800/70 bg-[#0e0e10] p-8">
          <p className="text-sm text-zinc-400">
            You don&apos;t have an active membership yet. Join a gym from the home page to get
            started.
          </p>
          <Link
            href="/dashboard/user"
            className="mt-4 inline-flex rounded-xl bg-[#FACC15] px-4 py-2.5 text-sm font-bold text-black transition hover:bg-[#e6c200]"
          >
            Browse Gyms
          </Link>
        </div>
      </div>
    );
  }

  const { daysRemaining, progressPercent } = getMembershipProgress(membership);

  function handleCancel() {
    leaveGym();
    router.push("/dashboard/user");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <h1 className="text-3xl font-bold text-white">My Membership</h1>

      <article className="relative overflow-hidden rounded-2xl border border-zinc-800/60 bg-[#0e0e10] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
        <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-[#FACC15]/10 blur-3xl" />

        <span className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-400">
          Active
        </span>

        <div className="mt-4">
          <p className="text-xl font-bold text-white">{membership.planName}</p>
          <p className="mt-0.5 text-sm text-zinc-500">{membership.gymName}</p>
        </div>

        <div className="mt-8">
          <p className="text-5xl font-extrabold leading-none text-[#FACC15]">{daysRemaining}</p>
          <p className="mt-1 text-sm text-zinc-500">days remaining</p>
        </div>

        <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-[#FACC15] transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <p className="mt-3 text-xs text-zinc-600">
          Renewing in advance automatically extends your remaining days.
        </p>

        <Link
          href={`/dashboard/user/gym/${joinedGymId}/join`}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#FACC15] px-5 py-3 text-sm font-bold text-black transition hover:bg-[#e6c200]"
        >
          <Plus className="h-4 w-4" />
          Renew Membership
        </Link>
      </article>

      <section className="rounded-2xl border border-red-500/30 bg-[#0e0e10] p-6">
        <div className="flex items-center gap-2 text-red-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <h2 className="text-sm font-bold">Cancel Membership</h2>
        </div>

        <div className="mt-4 rounded-xl border-l-2 border-red-500/60 bg-red-500/5 px-4 py-3">
          <p className="text-sm leading-relaxed text-red-400/90">
            Cancelling a membership is non-refundable. You&apos;ll be returned to the Home page and
            must join a gym again to access features.
          </p>
        </div>

        <button
          type="button"
          onClick={handleCancel}
          className="mt-5 rounded-xl border border-red-500/50 px-5 py-3 text-sm font-bold text-red-400 transition hover:bg-red-500/10"
        >
          Cancel My Membership
        </button>
      </section>
    </div>
  );
}

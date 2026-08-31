"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, Plus, XCircle } from "lucide-react";
import type { CompletedMembership } from "@/stores/join-gym-store";
import { useAuthStore } from "@/stores/auth-store";
import { useMembershipStore } from "@/stores/membership-store";
import {
  formatApprovalTime,
  useWalkInApprovalsStore,
} from "@/stores/walk-in-approvals-store";

function getMembershipProgress(membership: CompletedMembership) {
  const durationDays = membership.durationDays ?? 30;
  const expiresAt = membership.expiresAt
    ? new Date(membership.expiresAt)
    : membership.joinedAt
      ? new Date(
          new Date(membership.joinedAt).getTime() + durationDays * 24 * 60 * 60 * 1000,
        )
      : null;
  const daysRemaining = expiresAt
    ? Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : durationDays;
  const progressPercent = durationDays > 0 ? (daysRemaining / durationDays) * 100 : 0;

  return { daysRemaining, progressPercent, durationDays, expiresAt };
}

export default function MembershipPage() {
  const router = useRouter();
  const userId = useAuthStore((state) => state.user?.id);
  const membership = useMembershipStore((state) => state.membership);
  const joinedGymId = useMembershipStore((state) => state.joinedGymId);
  const renewalHistory = useMembershipStore((state) => state.renewalHistory);
  const leaveGym = useMembershipStore((state) => state.leaveGym);
  const fetchMembership = useMembershipStore((state) => state.fetchMembership);
  const requests = useWalkInApprovalsStore((state) => state.requests);
  const fetchUserStatus = useWalkInApprovalsStore((state) => state.fetchUserStatus);
  const completeOnboarding = useWalkInApprovalsStore((state) => state.completeOnboarding);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    void fetchMembership();
    void fetchUserStatus();
  }, [fetchMembership, fetchUserStatus]);

  const renewalRequest = useMemo(() => {
    if (!userId || !joinedGymId) return null;

    const renewals = requests
      .filter(
        (req) =>
          req.userId === userId &&
          req.gymId === joinedGymId &&
          Boolean(req.isRenewal),
      )
      .sort((a, b) => b.submittedAt - a.submittedAt);

    // A new pending/approved renewal always replaces an old rejection
    const pending = renewals.find((req) => req.status === "pending");
    if (pending) return pending;

    const approvedOpen = renewals.find(
      (req) => req.status === "approved" && !req.consumedAt,
    );
    if (approvedOpen) return approvedOpen;

    // Show declined only if nothing newer was submitted after it
    const declined = renewals.find((req) => req.status === "declined");
    if (!declined) return null;
    const superseded = renewals.some(
      (req) =>
        req.id !== declined.id &&
        req.submittedAt >= declined.submittedAt &&
        req.status !== "declined",
    );
    return superseded ? null : declined;
  }, [requests, userId, joinedGymId]);

  // Open walk-in / GCash join for a gym the user is not enrolled in yet (multi-gym safe)
  const openJoinRequest = useMemo(() => {
    if (!userId) return null;
    const enrolled = useMembershipStore.getState().enrolledGymIds;
    const mine = requests
      .filter(
        (req) =>
          req.userId === userId &&
          !req.isRenewal &&
          !enrolled.includes(req.gymId),
      )
      .sort((a, b) => b.submittedAt - a.submittedAt);

    const pending = mine.find((req) => req.status === "pending");
    if (pending) return pending;

    const approved = mine.find((req) => req.status === "approved" && !req.consumedAt);
    if (approved) return approved;

    const declined = mine.find((req) => req.status === "declined");
    if (!declined) return null;
    const superseded = mine.some(
      (req) =>
        req.id !== declined.id &&
        req.submittedAt >= declined.submittedAt &&
        req.status !== "declined",
    );
    return superseded ? null : declined;
  }, [requests, userId, membership, joinedGymId]);

  if (!membership || !joinedGymId) {
    const pendingJoin = openJoinRequest?.status === "pending" ? openJoinRequest : null;
    const approvedJoin = openJoinRequest?.status === "approved" ? openJoinRequest : null;
    const rejectedJoin = openJoinRequest?.status === "declined" ? openJoinRequest : null;

    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-3xl font-bold text-white">My Membership</h1>

        {pendingJoin ? (
          <section className="rounded-2xl border border-amber-500/30 bg-[#0e0e10] p-6">
            <div className="flex items-center gap-2 text-amber-400">
              <Clock3 className="h-4 w-4 shrink-0" />
              <h2 className="text-sm font-bold">Pending Approval</h2>
            </div>
            <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              <p className="text-zinc-400">
                <span className="text-zinc-600">Reference Number:</span>{" "}
                <span className="font-mono font-semibold text-[#FACC15]">
                  {pendingJoin.paymentRef}
                </span>
              </p>
              <p className="text-zinc-400">
                <span className="text-zinc-600">Status:</span>{" "}
                <span className="font-semibold text-amber-400">
                  Waiting for Owner/Clerk Approval
                </span>
              </p>
              <p className="text-zinc-400">
                <span className="text-zinc-600">Gym:</span> {pendingJoin.gymName}
              </p>
              <p className="text-zinc-400">
                <span className="text-zinc-600">Selected Plan:</span> {pendingJoin.planName}
              </p>
              <p className="text-zinc-400">
                <span className="text-zinc-600">Plan Duration:</span>{" "}
                {pendingJoin.durationDays} day{pendingJoin.durationDays === 1 ? "" : "s"}
              </p>
              <p className="text-zinc-400">
                <span className="text-zinc-600">Submitted:</span>{" "}
                {formatApprovalTime(pendingJoin.submittedAt)}
              </p>
            </div>
            <p className="mt-4 text-xs text-zinc-500">
              Member features stay locked until the gym Owner or Clerk approves and completes your
              membership.
            </p>
          </section>
        ) : null}

        {approvedJoin ? (
          <section className="rounded-2xl border border-emerald-500/30 bg-[#0e0e10] p-6">
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <h2 className="text-sm font-bold">Membership Approved</h2>
            </div>
            <p className="mt-3 text-sm text-zinc-400">
              Your request for {approvedJoin.gymName} was approved. Confirm to activate your
              membership and unlock member features.
            </p>
            <button
              type="button"
              disabled={completing}
              onClick={() => {
                void (async () => {
                  setCompleting(true);
                  const ok = await completeOnboarding(approvedJoin.id);
                  await fetchMembership();
                  setCompleting(false);
                  if (!ok) return;
                })();
              }}
              className="mt-4 inline-flex rounded-xl bg-[#FACC15] px-5 py-2.5 text-sm font-bold text-black transition hover:bg-[#e6c200] disabled:opacity-60"
            >
              {completing ? "Activating…" : "Activate Membership"}
            </button>
          </section>
        ) : null}

        {rejectedJoin ? (
          <section className="rounded-2xl border border-red-500/30 bg-[#0e0e10] p-6">
            <div className="flex items-center gap-2 text-red-400">
              <XCircle className="h-4 w-4 shrink-0" />
              <h2 className="text-sm font-bold">Request Rejected</h2>
            </div>
            <p className="mt-3 text-sm text-red-400/90">
              {rejectedJoin.rejectionReason ||
                "Your membership request was rejected by the gym."}
            </p>
            <p className="mt-2 text-xs text-zinc-500">
              You can pay again anytime — rejection is not permanent.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href={`/dashboard/user/gym/${rejectedJoin.gymId}/join`}
                className="inline-flex rounded-xl bg-[#FACC15] px-4 py-2.5 text-sm font-bold text-black transition hover:bg-[#e6c200]"
              >
                Try again / Pay again
              </Link>
              <Link
                href="/dashboard/user"
                className="inline-flex rounded-xl border border-[#FACC15]/40 px-4 py-2.5 text-sm font-bold text-[#FACC15] transition hover:bg-[#FACC15]/10"
              >
                Browse Gyms
              </Link>
            </div>
          </section>
        ) : null}

        {!pendingJoin && !approvedJoin && !rejectedJoin ? (
          <div className="rounded-2xl border border-zinc-800/70 bg-[#0e0e10] p-8">
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
        ) : null}
      </div>
    );
  }

  const { daysRemaining, progressPercent, expiresAt } = getMembershipProgress(membership);
  const pendingRenewal = renewalRequest?.status === "pending" ? renewalRequest : null;
  const approvedRenewal =
    renewalRequest?.status === "approved" && !renewalRequest.consumedAt
      ? renewalRequest
      : null;
  const rejectedRenewal = renewalRequest?.status === "declined" ? renewalRequest : null;
  const pendingOtherJoin =
    openJoinRequest?.status === "pending" ? openJoinRequest : null;
  const approvedOtherJoin =
    openJoinRequest?.status === "approved" ? openJoinRequest : null;

  function handleCancel() {
    void leaveGym().then(() => {
      router.push("/dashboard/user");
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <h1 className="text-3xl font-bold text-white">My Membership</h1>

      {pendingOtherJoin ? (
        <section className="rounded-2xl border border-amber-500/30 bg-[#0e0e10] p-6">
          <div className="flex items-center gap-2 text-amber-400">
            <Clock3 className="h-4 w-4 shrink-0" />
            <h2 className="text-sm font-bold">Pending Approval — Another Gym</h2>
          </div>
          <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <p className="text-zinc-400">
              <span className="text-zinc-600">Gym:</span> {pendingOtherJoin.gymName}
            </p>
            <p className="text-zinc-400">
              <span className="text-zinc-600">Status:</span>{" "}
              <span className="font-semibold text-amber-400">
                Waiting for Owner/Clerk Approval
              </span>
            </p>
            <p className="text-zinc-400">
              <span className="text-zinc-600">Selected Plan:</span> {pendingOtherJoin.planName}
            </p>
            <p className="text-zinc-400">
              <span className="text-zinc-600">Reference Number:</span>{" "}
              <span className="font-mono font-semibold text-[#FACC15]">
                {pendingOtherJoin.paymentRef}
              </span>
            </p>
          </div>
          <p className="mt-4 text-xs text-zinc-500">
            Your current gym membership stays active. This request is independent.
          </p>
        </section>
      ) : null}

      {approvedOtherJoin ? (
        <section className="rounded-2xl border border-emerald-500/30 bg-[#0e0e10] p-6">
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <h2 className="text-sm font-bold">Membership Approved — Another Gym</h2>
          </div>
          <p className="mt-3 text-sm text-zinc-400">
            Your request for {approvedOtherJoin.gymName} was approved. Confirm to activate that
            membership (your current gym stays selected until you switch).
          </p>
          <button
            type="button"
            disabled={completing}
            onClick={() => {
              void (async () => {
                setCompleting(true);
                const ok = await completeOnboarding(approvedOtherJoin.id);
                await fetchMembership();
                setCompleting(false);
                if (!ok) return;
              })();
            }}
            className="mt-4 inline-flex rounded-xl bg-[#FACC15] px-5 py-2.5 text-sm font-bold text-black transition hover:bg-[#e6c200] disabled:opacity-60"
          >
            {completing ? "Activating…" : "Activate Membership"}
          </button>
        </section>
      ) : null}

      {pendingRenewal ? (
        <section className="rounded-2xl border border-amber-500/30 bg-[#0e0e10] p-6">
          <div className="flex items-center gap-2 text-amber-400">
            <Clock3 className="h-4 w-4 shrink-0" />
            <h2 className="text-sm font-bold">Pending Approval</h2>
          </div>
          <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <p className="text-zinc-400">
              <span className="text-zinc-600">Reference Number:</span>{" "}
              <span className="font-mono font-semibold text-[#FACC15]">
                {pendingRenewal.paymentRef}
              </span>
            </p>
            <p className="text-zinc-400">
              <span className="text-zinc-600">Status:</span>{" "}
              <span className="font-semibold text-amber-400">Pending Approval</span>
            </p>
            <p className="text-zinc-400">
              <span className="text-zinc-600">Selected Plan:</span> {pendingRenewal.planName}
            </p>
            <p className="text-zinc-400">
              <span className="text-zinc-600">Plan Duration:</span>{" "}
              {pendingRenewal.durationDays} day{pendingRenewal.durationDays === 1 ? "" : "s"}
            </p>
            <p className="text-zinc-400">
              <span className="text-zinc-600">Plan Price:</span> ₱
              {pendingRenewal.planPrice.toLocaleString()}
            </p>
            <p className="text-zinc-400">
              <span className="text-zinc-600">Submitted:</span>{" "}
              {formatApprovalTime(pendingRenewal.submittedAt)}
            </p>
          </div>
          <p className="mt-4 text-xs text-zinc-500">
            Your current membership stays active. Days are extended only after approval and you tap
            Done / Activate Membership.
          </p>
        </section>
      ) : null}

      {approvedRenewal ? (
        <section className="rounded-2xl border border-emerald-500/30 bg-[#0e0e10] p-6">
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <h2 className="text-sm font-bold">Renewal Approved</h2>
          </div>
          <p className="mt-3 text-sm text-zinc-400">
            Your renewal for {approvedRenewal.gymName || "your gym"} was approved. Confirm to apply
            your new plan days.
          </p>
          <button
            type="button"
            disabled={completing}
            onClick={() => {
              void (async () => {
                setCompleting(true);
                const ok = await completeOnboarding(approvedRenewal.id);
                await fetchMembership();
                setCompleting(false);
                if (!ok) return;
              })();
            }}
            className="mt-4 inline-flex rounded-xl bg-[#FACC15] px-5 py-2.5 text-sm font-bold text-black transition hover:bg-[#e6c200] disabled:opacity-60"
          >
            {completing ? "Activating…" : "Activate Membership"}
          </button>
        </section>
      ) : null}

      {rejectedRenewal ? (
        <section className="rounded-2xl border border-red-500/30 bg-[#0e0e10] p-6">
          <div className="flex items-center gap-2 text-red-400">
            <XCircle className="h-4 w-4 shrink-0" />
            <h2 className="text-sm font-bold">Renewal Rejected</h2>
          </div>
          <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <p className="text-zinc-400">
              <span className="text-zinc-600">Reference Number:</span>{" "}
              <span className="font-mono font-semibold text-[#FACC15]">
                {rejectedRenewal.paymentRef}
              </span>
            </p>
            <p className="text-zinc-400">
              <span className="text-zinc-600">Status:</span>{" "}
              <span className="font-semibold text-red-400">Rejected</span>
            </p>
            <p className="text-zinc-400">
              <span className="text-zinc-600">Selected Plan:</span> {rejectedRenewal.planName}
            </p>
            <p className="text-zinc-400">
              <span className="text-zinc-600">Plan Duration:</span>{" "}
              {rejectedRenewal.durationDays} day{rejectedRenewal.durationDays === 1 ? "" : "s"}
            </p>
          </div>
          <p className="mt-3 text-sm text-red-400/90">
            {rejectedRenewal.rejectionReason ||
              "Your renewal was rejected. Your current membership was not changed."}
          </p>
          <Link
            href={`/dashboard/user/gym/${joinedGymId}/join?renew=1`}
            className="mt-4 inline-flex rounded-xl border border-[#FACC15]/40 px-4 py-2.5 text-sm font-bold text-[#FACC15] transition hover:bg-[#FACC15]/10"
          >
            Submit another renewal
          </Link>
        </section>
      ) : null}

      <article className="relative overflow-hidden rounded-2xl border border-zinc-800/60 bg-[#0e0e10] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
        <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-[#FACC15]/10 blur-3xl" />

        <span className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-400">
          Active
        </span>

        <div className="mt-4">
          <p className="text-xl font-bold text-white">{membership.planName}</p>
          <p className="mt-0.5 text-sm text-zinc-500">{membership.gymName}</p>
          {membership.coachName ? (
            <p className="mt-2 text-sm text-zinc-300">
              Assigned coach:{" "}
              <span className="font-medium text-[#FACC15]">{membership.coachName}</span>
              {membership.coachSessionPrice
                ? ` · ₱${membership.coachSessionPrice.toLocaleString()}/session`
                : null}
            </p>
          ) : null}
        </div>

        <div className="mt-8">
          <p className="text-5xl font-extrabold leading-none text-[#FACC15]">{daysRemaining}</p>
          <p className="mt-1 text-sm text-zinc-500">days remaining</p>
        </div>

        <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-[#FACC15] transition-all duration-500"
            style={{ width: `${Math.min(100, progressPercent)}%` }}
          />
        </div>

        <p className="mt-3 text-xs text-zinc-600">
          Expires{" "}
          {expiresAt
            ? expiresAt.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : "—"}
          . Renewing in advance extends your remaining days after Owner/Clerk approval.
        </p>

        {!pendingRenewal ? (
          <Link
            href={`/dashboard/user/gym/${joinedGymId}/join?renew=1`}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#FACC15] px-5 py-3 text-sm font-bold text-black transition hover:bg-[#e6c200]"
          >
            <Plus className="h-4 w-4" />
            Renew Membership
          </Link>
        ) : null}
      </article>

      <section className="rounded-2xl border border-zinc-800/70 bg-[#0e0e10] p-6">
        <h2 className="text-lg font-bold text-white">Renewal History</h2>
        {renewalHistory.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">No renewals yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-zinc-800/60">
            {renewalHistory.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-white">{item.planName}</p>
                  <p className="text-xs text-zinc-500">
                    {item.durationDays} days · {item.paymentMethod} ·{" "}
                    {item.renewalDate
                      ? formatApprovalTime(new Date(item.renewalDate).getTime())
                      : "—"}
                  </p>
                </div>
                <p className="font-semibold text-[#FACC15]">
                  ₱{item.totalPaid.toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

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

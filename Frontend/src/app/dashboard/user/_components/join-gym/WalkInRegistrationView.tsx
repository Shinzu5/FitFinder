"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import type { PublicGymProfile } from "../../_lib/gym-profile";
import { makeWalkInRef, useJoinGymStore } from "@/stores/join-gym-store";
import { useAuthStore } from "@/stores/auth-store";
import { useMembershipStore } from "@/stores/membership-store";
import { useWalkInApprovalsStore } from "@/stores/walk-in-approvals-store";
import { JoinGymHeader } from "./JoinGymHeader";
import { buildCompletedMembership } from "./join-utils";

interface WalkInRegistrationViewProps {
  profile: PublicGymProfile;
}

/**
 * Walk-in flow:
 * 1) Proceed → record payment + create pending approval in Neon
 * 2) Button becomes disabled "Waiting for Approval"
 * 3) Owner/Clerk Approve → button becomes enabled "Done"
 * 4) Done → Gymer dashboard (onboarding complete)
 */
export function WalkInRegistrationView({ profile }: WalkInRegistrationViewProps) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const joinedGymId = useMembershipStore((state) => state.joinedGymId);
  const resetJoin = useJoinGymStore((state) => state.resetJoin);
  const { selectedPlanId, selectedCoachId } = useJoinGymStore();
  const requests = useWalkInApprovalsStore((state) => state.requests);
  const submitRequest = useWalkInApprovalsStore((state) => state.submitRequest);
  const completeOnboarding = useWalkInApprovalsStore((state) => state.completeOnboarding);
  const fetchUserStatus = useWalkInApprovalsStore((state) => state.fetchUserStatus);
  const fetchMembership = useMembershipStore((state) => state.fetchMembership);

  const [referenceNo] = useState(() => makeWalkInRef(profile.name));
  const [submitting, setSubmitting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPlan = useMemo(
    () => profile.plans.find((plan) => plan.id === selectedPlanId) ?? profile.plans[0],
    [profile.plans, selectedPlanId],
  );
  const selectedCoach = useMemo(
    () => profile.coaches.find((coach) => coach.id === selectedCoachId) ?? null,
    [profile.coaches, selectedCoachId],
  );
  const total =
    (selectedPlan?.price ?? 0) + (selectedCoach?.sessionPrice ?? 0);

  const userRequest = useMemo(() => {
    if (!user?.id) return null;
    // Prefer open (not consumed) request for this gym
    const open = requests.find(
      (req) =>
        req.userId === user.id &&
        req.gymId === profile.id &&
        !req.consumedAt &&
        req.status !== "declined",
    );
    if (open) return open;
    return (
      requests.find((req) => req.userId === user.id && req.gymId === profile.id) ?? null
    );
  }, [requests, user?.id, profile.id]);

  const isPending = userRequest?.status === "pending";
  const isApproved =
    userRequest?.status === "approved" ||
    (joinedGymId === profile.id && userRequest?.status !== "declined");
  const isRejected = userRequest?.status === "declined";
  const onboardingDone = Boolean(userRequest?.consumedAt);

  // Socket handles live updates; slow poll only as safety net while waiting
  useEffect(() => {
    void fetchUserStatus();
    const id = window.setInterval(() => {
      void fetchUserStatus();
      if (useMembershipStore.getState().joinedGymId) return;
      void fetchMembership();
    }, 30000);
    return () => window.clearInterval(id);
  }, [fetchUserStatus, fetchMembership]);

  // Already finished onboarding — never show this screen again
  useEffect(() => {
    if (onboardingDone && joinedGymId === profile.id) {
      resetJoin();
      router.replace("/dashboard/user");
    }
  }, [onboardingDone, joinedGymId, profile.id, resetJoin, router]);

  const handleProceed = useCallback(async () => {
    if (!user?.id || !selectedPlan || submitting || isPending || isApproved) return;

    if (!selectedPlan.id || selectedPlan.id === "plan-default") {
      // Still allow proceed — backend will create a real MembershipPlan
    }

    const details = buildCompletedMembership({
      profile,
      plan: selectedPlan,
      coach: selectedCoach,
      paymentMethod: "walk-in",
      paymentRef: referenceNo,
    });

    setSubmitting(true);
    setError(null);
    const result = await submitRequest({
      userId: user.id,
      memberName: user.fullName,
      memberEmail: user.email,
      membership: details,
      durationDays: details.durationDays ?? 30,
    });
    setSubmitting(false);

    if (!result) {
      const msg =
        useWalkInApprovalsStore.getState().error ||
        "Could not process walk-in payment. Please try again.";
      setError(msg);
      return;
    }
    void fetchUserStatus();
  }, [
    user,
    selectedPlan,
    selectedCoach,
    submitting,
    isPending,
    isApproved,
    profile,
    referenceNo,
    submitRequest,
    fetchUserStatus,
  ]);

  const handleDone = useCallback(async () => {
    if (!userRequest?.id || !isApproved || completing) return;
    setCompleting(true);
    setError(null);
    const ok = await completeOnboarding(userRequest.id);
    await fetchMembership();
    setCompleting(false);
    if (!ok) {
      setError("Could not finish onboarding. Please try again.");
      return;
    }
    resetJoin();
    router.replace("/dashboard/user");
  }, [
    userRequest?.id,
    isApproved,
    completing,
    completeOnboarding,
    fetchMembership,
    resetJoin,
    router,
  ]);

  if (isRejected) {
    return (
      <div className="min-h-screen bg-black text-white">
        <JoinGymHeader
          title="Walk-in Membership"
          backHref={`/dashboard/user/gym/${profile.id}/join`}
        />
        <div className="mx-auto max-w-md px-4 py-16 text-center">
          <XCircle className="mx-auto h-14 w-14 text-red-400" />
          <h2 className="mt-4 text-2xl font-bold text-white">Request Rejected</h2>
          <p className="mt-2 text-sm text-zinc-400">
            {userRequest?.rejectionReason ||
              "Your walk-in membership request was rejected by the gym."}
          </p>
          <p className="mt-4 text-xs text-zinc-500">
            Contact {profile.name} or purchase another membership plan.
          </p>
          <button
            type="button"
            onClick={() => router.push(`/dashboard/user/gym/${profile.id}/join`)}
            className="mt-8 w-full rounded-xl bg-[#FFD700] py-3.5 text-sm font-bold text-black"
          >
            Choose another plan
          </button>
        </div>
      </div>
    );
  }

  const buttonLabel = submitting
    ? "Processing…"
    : completing
      ? "Opening dashboard…"
      : isApproved
        ? "Done"
        : isPending
          ? "Waiting for Approval"
          : "Proceed";

  const buttonEnabled = !submitting && !completing && (isApproved || (!isPending && !isApproved));
  const showAsWaiting = isPending && !isApproved;

  return (
    <div className="min-h-screen bg-black text-white">
      <JoinGymHeader
        title="Walk-in Membership"
        backHref={`/dashboard/user/gym/${profile.id}/join`}
      />

      <div className="mx-auto max-w-md space-y-6 px-4 py-10">
        <article className="rounded-2xl border border-white/10 bg-[#141414] px-6 py-8 text-center">
          {isApproved ? (
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" />
          ) : (
            <Clock3 className="mx-auto h-12 w-12 text-[#FFD700]" />
          )}
          <h2 className="mt-4 text-xl font-bold text-white">
            {isApproved
              ? "Membership Approved"
              : isPending
                ? "Waiting for Approval"
                : "Confirm Walk-in Payment"}
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            {isApproved
              ? "Your membership is active. Tap Done to open your Gymer dashboard."
              : isPending
                ? "Payment recorded. Waiting for the Gym Owner or Clerk to approve."
                : `Confirm walk-in for ${profile.name}. After Proceed, staff must approve before you can continue.`}
          </p>

          <div className="mt-6 rounded-xl border border-white/10 bg-black/40 px-4 py-4">
            <p className="text-xs text-zinc-500">Reference</p>
            <p className="mt-1 font-mono text-lg font-bold tracking-wider text-[#FFD700]">
              {userRequest?.paymentRef ?? referenceNo}
            </p>
            <p className="mt-3 text-sm text-zinc-400">
              {selectedPlan?.name} · ₱{total.toLocaleString()}
            </p>
          </div>
        </article>

        {error ? <p className="text-center text-sm text-red-400">{error}</p> : null}

        <button
          type="button"
          onClick={() => {
            if (isApproved) void handleDone();
            else if (!isPending) void handleProceed();
          }}
          disabled={!buttonEnabled || showAsWaiting}
          aria-disabled={!buttonEnabled || showAsWaiting}
          className={`w-full rounded-xl py-4 text-sm font-bold transition ${
            isApproved
              ? "bg-[#FFD700] text-black hover:bg-[#e6c200]"
              : showAsWaiting
                ? "cursor-not-allowed border border-white/10 bg-[#1a1a1a] text-zinc-500"
                : "border border-[#FFD700]/50 text-[#FFD700] hover:bg-[#FFD700]/10"
          }`}
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}

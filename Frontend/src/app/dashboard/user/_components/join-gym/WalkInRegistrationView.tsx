"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
 * Walk-in flow (new join):
 * 1) Proceed → pending approval
 * 2) Owner/Clerk Approve → Done → Gymer home
 *
 * Renewal flow (?renew=1):
 * 1) Proceed → pending renewal approval
 * 2) Return to Membership page (never Home)
 * 3) Approval extends days via Socket.IO on Membership
 */
export function WalkInRegistrationView({ profile }: WalkInRegistrationViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isRenewalFlow = searchParams.get("renew") === "1";
  const user = useAuthStore((state) => state.user);
  const joinedGymId = useMembershipStore((state) => state.joinedGymId);
  const resetJoin = useJoinGymStore((state) => state.resetJoin);
  const { selectedPlanId, selectedCoachId } = useJoinGymStore();
  const requests = useWalkInApprovalsStore((state) => state.requests);
  const submitRequest = useWalkInApprovalsStore((state) => state.submitRequest);
  const completeOnboarding = useWalkInApprovalsStore((state) => state.completeOnboarding);
  const fetchUserStatus = useWalkInApprovalsStore((state) => state.fetchUserStatus);
  const fetchMembership = useMembershipStore((state) => state.fetchMembership);

  const [referenceNo, setReferenceNo] = useState(() => makeWalkInRef(profile.name));
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
  const total = (selectedPlan?.price ?? 0) + (selectedCoach?.sessionPrice ?? 0);

  const userRequest = useMemo(() => {
    if (!user?.id) return null;

    // Open pending / approved-not-consumed only — declined must not block retry
    const open = requests.find(
      (req) =>
        req.userId === user.id &&
        req.gymId === profile.id &&
        !req.consumedAt &&
        (req.status === "pending" || req.status === "approved"),
    );
    if (open) return open;

    // Renewals: show latest renewal (incl. declined) so Membership can display status
    if (isRenewalFlow) {
      return (
        requests
          .filter(
            (req) =>
              req.userId === user.id &&
              req.gymId === profile.id &&
              Boolean(req.isRenewal),
          )
          .sort((a, b) => b.submittedAt - a.submittedAt)[0] ?? null
      );
    }

    return null;
  }, [requests, user?.id, profile.id, isRenewalFlow]);

  const latestDeclined = useMemo(() => {
    if (!user?.id) return null;
    return (
      requests
        .filter(
          (req) =>
            req.userId === user.id &&
            req.gymId === profile.id &&
            req.status === "declined",
        )
        .sort((a, b) => b.submittedAt - a.submittedAt)[0] ?? null
    );
  }, [requests, user?.id, profile.id]);

  const isPending = userRequest?.status === "pending";
  // Never treat "already a member" as approved — that broke renewals (instant Done → Home)
  const isApproved = userRequest?.status === "approved" && !userRequest.consumedAt;
  const isRejected = Boolean(latestDeclined) && !userRequest && !isRenewalFlow;
  const onboardingDone = Boolean(userRequest?.consumedAt) && !userRequest?.isRenewal;

  useEffect(() => {
    void fetchUserStatus();
  }, [fetchUserStatus]);

  // New-join only: finished onboarding → home. Renewals never auto-redirect to Home.
  useEffect(() => {
    if (isRenewalFlow) return;
    if (onboardingDone && joinedGymId === profile.id) {
      resetJoin();
      router.replace("/dashboard/user");
    }
  }, [isRenewalFlow, onboardingDone, joinedGymId, profile.id, resetJoin, router]);

  // Pending / rejected requests belong on My Membership (not join shell / Home)
  useEffect(() => {
    if (isPending || (isRejected && isRenewalFlow)) {
      resetJoin();
      router.replace("/dashboard/user/membership");
    }
  }, [isPending, isRejected, isRenewalFlow, resetJoin, router]);

  const handleProceed = useCallback(async () => {
    if (!user?.id || !selectedPlan || submitting || isPending) return;
    // Block re-submit only for open approved new-join (not renewals)
    if (isApproved && !isRenewalFlow) return;

    if (!selectedPlan?.id) {
      setError("No membership plans available.");
      return;
    }

    // Fresh reference on every submit so a prior rejection never blocks repay
    const paymentRef = makeWalkInRef(profile.name);
    setReferenceNo(paymentRef);

    const details = buildCompletedMembership({
      profile,
      plan: selectedPlan,
      coach: selectedCoach,
      paymentMethod: "walk-in",
      paymentRef,
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

    // Always return to My Membership while Pending — never unlock Home features
    resetJoin();
    router.replace("/dashboard/user/membership");
  }, [
    user,
    selectedPlan,
    selectedCoach,
    submitting,
    isPending,
    isApproved,
    isRenewalFlow,
    profile,
    referenceNo,
    submitRequest,
    fetchUserStatus,
    resetJoin,
    router,
  ]);

  const handleDone = useCallback(async () => {
    if (!userRequest?.id || !isApproved || completing || isRenewalFlow) return;
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
    isRenewalFlow,
    completeOnboarding,
    fetchMembership,
    resetJoin,
    router,
  ]);

  const buttonLabel = submitting
    ? "Processing…"
    : completing
      ? "Opening dashboard…"
      : isApproved && !isRenewalFlow
        ? "Done"
        : isPending
          ? "Waiting for Approval"
          : isRenewalFlow
            ? "Submit Renewal"
            : isRejected
              ? "Submit again"
              : "Proceed";

  const buttonEnabled =
    !submitting &&
    !completing &&
    ((isApproved && !isRenewalFlow) || (!isPending && !isApproved));
  const showAsWaiting = isPending;

  return (
    <div className="min-h-screen bg-black text-white">
      <JoinGymHeader
        title={isRenewalFlow ? "Renew Membership" : "Walk-in Membership"}
        backHref={
          isRenewalFlow
            ? "/dashboard/user/membership"
            : `/dashboard/user/gym/${profile.id}/join`
        }
      />

      <div className="mx-auto max-w-md space-y-6 px-4 py-10">
        {isRejected && latestDeclined ? (
          <article className="rounded-2xl border border-red-500/30 bg-[#141414] px-6 py-6 text-center">
            <XCircle className="mx-auto h-12 w-12 text-red-400" />
            <h2 className="mt-3 text-xl font-bold text-white">Request Rejected</h2>
            <p className="mt-2 text-sm text-zinc-400">
              {latestDeclined.rejectionReason ||
                "Your walk-in membership request was rejected by the gym."}
            </p>
            <p className="mt-3 text-xs text-zinc-500">
              Rejection is not permanent. Choose another plan or submit again below to pay and
              request approval.
            </p>
            <button
              type="button"
              onClick={() => router.push(`/dashboard/user/gym/${profile.id}/join`)}
              className="mt-5 w-full rounded-xl border border-[#FFD700]/40 py-3 text-sm font-bold text-[#FFD700] transition hover:bg-[#FFD700]/10"
            >
              Choose another plan
            </button>
          </article>
        ) : null}

        <article className="rounded-2xl border border-white/10 bg-[#141414] px-6 py-8 text-center">
          {isApproved && !isRenewalFlow ? (
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" />
          ) : (
            <Clock3 className="mx-auto h-12 w-12 text-[#FFD700]" />
          )}
          <h2 className="mt-4 text-xl font-bold text-white">
            {isApproved && !isRenewalFlow
              ? "Membership Approved"
              : isPending
                ? "Waiting for Approval"
                : isRenewalFlow
                  ? "Confirm Renewal"
                  : isRejected
                    ? "Submit a new request"
                    : "Confirm Walk-in Payment"}
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            {isApproved && !isRenewalFlow
              ? "Your membership is active. Tap Done to open your Gymer dashboard."
              : isPending
                ? "Payment recorded. Waiting for the Gym Owner or Clerk to approve."
                : isRenewalFlow
                  ? `Submit renewal for ${profile.name}. You will return to My Membership while staff approve.`
                  : isRejected
                    ? `You can pay again for ${profile.name}. A new request will be sent for Owner/Clerk approval.`
                    : `Confirm walk-in for ${profile.name}. After Proceed, staff must approve before you can continue.`}
          </p>

          <div className="mt-6 rounded-xl border border-white/10 bg-black/40 px-4 py-4">
            <p className="text-xs text-zinc-500">Reference</p>
            <p className="mt-1 font-mono text-lg font-bold tracking-wider text-[#FFD700]">
              {userRequest?.paymentRef ?? referenceNo}
            </p>
            <p className="mt-3 text-sm text-zinc-400">
              {selectedPlan?.name}
              {selectedPlan?.durationLabel ? ` · ${selectedPlan.durationLabel}` : ""} · ₱
              {total.toLocaleString()}
            </p>
          </div>
        </article>

        {error ? <p className="text-center text-sm text-red-400">{error}</p> : null}

        <button
          type="button"
          onClick={() => {
            if (isApproved && !isRenewalFlow) void handleDone();
            else if (!isPending) void handleProceed();
          }}
          disabled={!buttonEnabled || showAsWaiting}
          aria-disabled={!buttonEnabled || showAsWaiting}
          className={`w-full rounded-xl py-4 text-sm font-bold transition ${
            isApproved && !isRenewalFlow
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

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Clock3, XCircle } from "lucide-react";
import type { PublicGymProfile } from "../../_lib/gym-profile";
import { makeWalkInRef, useJoinGymStore } from "@/stores/join-gym-store";
import { useAuthStore } from "@/stores/auth-store";
import { useMembershipStore } from "@/stores/membership-store";
import {
  approvalToMembership,
  useWalkInApprovalsStore,
} from "@/stores/walk-in-approvals-store";
import { JoinGymHeader } from "./JoinGymHeader";
import { buildCompletedMembership } from "./join-utils";

interface WalkInRegistrationViewProps {
  profile: PublicGymProfile;
}

function StepNumber({ n }: { n: number }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FFD700] text-sm font-bold text-black">
      {n}
    </span>
  );
}

export function WalkInRegistrationView({ profile }: WalkInRegistrationViewProps) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const joinGym = useMembershipStore((state) => state.joinGym);
  const joinedGymId = useMembershipStore((state) => state.joinedGymId);
  const resetJoin = useJoinGymStore((state) => state.resetJoin);
  const { selectedPlanId, selectedCoachId } = useJoinGymStore();
  const requests = useWalkInApprovalsStore((state) => state.requests);
  const submitRequest = useWalkInApprovalsStore((state) => state.submitRequest);
  const markConsumed = useWalkInApprovalsStore((state) => state.markConsumed);

  const [referenceNo, setReferenceNo] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const selectedPlan = useMemo(
    () => profile.plans.find((plan) => plan.id === selectedPlanId) ?? profile.plans[0],
    [profile.plans, selectedPlanId],
  );
  const selectedCoach = useMemo(
    () => profile.coaches.find((coach) => coach.id === selectedCoachId) ?? null,
    [profile.coaches, selectedCoachId],
  );
  const total = selectedPlan?.price ?? 0;

  const userRequest = useMemo(() => {
    if (!user?.id) return null;
    return (
      requests.find(
        (req) => req.userId === user.id && req.gymId === profile.id,
      ) ?? null
    );
  }, [requests, user?.id, profile.id]);

  useEffect(() => {
    setReferenceNo(makeWalkInRef(profile.name));
  }, [profile.name]);

  useEffect(() => {
    if (!user?.id || joinedGymId) return;

    const approved = requests.find(
      (req) =>
        req.userId === user.id &&
        req.gymId === profile.id &&
        req.status === "approved" &&
        !req.consumedAt,
    );
    if (!approved) return;

    joinGym(approvalToMembership(approved));
    markConsumed(approved.id);
    resetJoin();
    router.push("/dashboard/user");
  }, [user?.id, joinedGymId, requests, profile.id, joinGym, markConsumed, resetJoin, router]);

  function handleProceed() {
    if (!selectedPlan || !user) return;

    const details = buildCompletedMembership({
      profile,
      plan: selectedPlan,
      coach: selectedCoach,
      paymentMethod: "walk-in",
      paymentRef: referenceNo,
    });

    submitRequest({
      userId: user.id,
      memberName: user.fullName,
      memberEmail: user.email,
      membership: details,
      durationDays: details.durationDays ?? 30,
    });

    setSubmitted(true);
  }

  if (userRequest?.status === "declined") {
    return (
      <div className="min-h-screen bg-black text-white">
        <JoinGymHeader
          title="Walk-in Registration"
          backHref={`/dashboard/user/gym/${profile.id}/join`}
        />
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <XCircle className="mx-auto h-14 w-14 text-red-400" />
          <h2 className="mt-4 text-2xl font-bold text-white">Request Declined</h2>
          <p className="mt-2 text-sm text-zinc-400">
            The front desk could not confirm your walk-in payment. Please speak with a clerk or
            try again with a different payment method.
          </p>
          <button
            type="button"
            onClick={() => router.push(`/dashboard/user/gym/${profile.id}/join`)}
            className="mt-6 rounded-xl bg-[#FFD700] px-5 py-3 text-sm font-bold text-black"
          >
            Back to Join Gym
          </button>
        </div>
      </div>
    );
  }

  if (userRequest?.status === "pending" || submitted) {
    return (
      <div className="min-h-screen bg-black text-white">
        <JoinGymHeader
          title="Walk-in Registration"
          backHref={`/dashboard/user/gym/${profile.id}/join`}
        />
        <div className="mx-auto max-w-lg space-y-6 px-4 py-10">
          <article className="rounded-2xl border border-[#FFD700]/50 bg-[#141414] px-6 py-8 text-center">
            <Clock3 className="mx-auto h-10 w-10 text-[#FFD700]" />
            <p className="mt-4 text-lg font-bold text-white">Waiting for Clerk Approval</p>
            <p className="mt-2 text-sm text-zinc-400">
              Show this reference number at the front desk. Your membership activates once the clerk
              confirms your cash payment.
            </p>
            <p className="mt-6 text-xs text-zinc-500">Reference Number</p>
            <p className="mt-2 text-3xl font-bold tracking-wider text-[#FFD700]">
              {userRequest?.paymentRef ?? referenceNo}
            </p>
          </article>

          <div className="rounded-xl border border-zinc-800 bg-[#141414] px-4 py-4 text-sm text-zinc-400">
            <p>
              <span className="text-zinc-500">Plan:</span> {selectedPlan?.name} — ₱
              {total.toLocaleString()}
            </p>
            <p className="mt-1">
              <span className="text-zinc-500">Gym:</span> {profile.name}
            </p>
          </div>

          <p className="text-center text-xs text-zinc-600">
            This page updates automatically when the clerk confirms your payment.
          </p>
        </div>
      </div>
    );
  }

  if (userRequest?.status === "approved") {
    return (
      <div className="min-h-screen bg-black text-white">
        <JoinGymHeader
          title="Walk-in Registration"
          backHref={`/dashboard/user/gym/${profile.id}/join`}
        />
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-400" />
          <h2 className="mt-4 text-2xl font-bold text-white">Payment Confirmed!</h2>
          <p className="mt-2 text-sm text-zinc-400">Activating your membership...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <JoinGymHeader
        title="Walk-in Registration"
        backHref={`/dashboard/user/gym/${profile.id}/join`}
      />

      <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        <article className="rounded-2xl border border-[#FFD700]/50 bg-[#141414] px-6 py-8 text-center">
          <p className="text-xs text-zinc-500">Reference Number</p>
          <p className="mt-2 text-3xl font-bold tracking-wider text-[#FFD700]">{referenceNo}</p>
        </article>

        <ol className="space-y-5">
          <li className="flex gap-4">
            <StepNumber n={1} />
            <div>
              <p className="font-semibold text-white">Go to the gym & show this screen</p>
              <p className="mt-1 text-sm leading-relaxed text-zinc-500">
                Visit {profile.name} at {profile.location}. Show your reference number to the front
                desk clerk.
              </p>
            </div>
          </li>
          <li className="flex gap-4">
            <StepNumber n={2} />
            <div>
              <p className="font-semibold text-white">Cooperate with the personal clerk</p>
              <p className="mt-1 text-sm leading-relaxed text-zinc-500">
                The clerk will verify your identity, explain gym rules, and confirm your selected
                plan and coach.
              </p>
            </div>
          </li>
          <li className="flex gap-4">
            <StepNumber n={3} />
            <div>
              <p className="font-semibold text-white">Pay the total amount in cash</p>
              <p className="mt-1 text-sm leading-relaxed text-zinc-500">
                Pay ₱{total.toLocaleString()} total (membership). The clerk will issue an official
                receipt.
              </p>
            </div>
          </li>
          <li className="flex gap-4">
            <StepNumber n={4} />
            <div>
              <p className="font-semibold text-white">Start training!</p>
              <p className="mt-1 text-sm leading-relaxed text-zinc-500">
                Membership activates after the clerk confirms payment in the system.
              </p>
            </div>
          </li>
        </ol>

        <div className="flex items-start gap-3 rounded-xl border border-[#FFD700]/30 bg-[#141414] px-4 py-3 text-sm text-[#FFD700]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Pay at the front desk: Plan: {selectedPlan?.name} — ₱{total.toLocaleString()} Total to
            pay: ₱{total.toLocaleString()}
          </p>
        </div>

        <button
          type="button"
          onClick={handleProceed}
          className="w-full rounded-xl border border-[#FFD700]/40 py-4 text-sm font-bold text-[#FFD700] transition hover:bg-[#FFD700]/10"
        >
          Submit for Clerk Approval →
        </button>
      </div>
    </div>
  );
}

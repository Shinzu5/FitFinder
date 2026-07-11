"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import type { PublicGymProfile } from "../../_lib/gym-profile";
import { makeWalkInRef, useJoinGymStore } from "@/stores/join-gym-store";
import { useMembershipStore } from "@/stores/membership-store";
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
  const joinGym = useMembershipStore((state) => state.joinGym);
  const resetJoin = useJoinGymStore((state) => state.resetJoin);
  const { selectedPlanId, selectedCoachId } = useJoinGymStore();
  const [referenceNo, setReferenceNo] = useState("");

  const selectedPlan = useMemo(
    () => profile.plans.find((plan) => plan.id === selectedPlanId) ?? profile.plans[0],
    [profile.plans, selectedPlanId],
  );
  const selectedCoach = useMemo(
    () => profile.coaches.find((coach) => coach.id === selectedCoachId) ?? null,
    [profile.coaches, selectedCoachId],
  );
  const total = selectedPlan?.price ?? 0;

  useEffect(() => {
    setReferenceNo(makeWalkInRef(profile.name));
  }, [profile.name]);

  function handleProceed() {
    if (!selectedPlan) return;
    const details = buildCompletedMembership({
      profile,
      plan: selectedPlan,
      coach: selectedCoach,
      paymentMethod: "walk-in",
      paymentRef: referenceNo,
    });
    joinGym(details);
    resetJoin();
    router.push("/dashboard/user");
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
          Proceed →
        </button>
      </div>
    </div>
  );
}

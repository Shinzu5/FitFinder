import type { PublicGymCoach, PublicGymPlan, PublicGymProfile } from "../../_lib/gym-profile";
import type { CompletedMembership, JoinPaymentMethod } from "@/stores/join-gym-store";

interface BuildMembershipInput {
  profile: PublicGymProfile;
  plan: PublicGymPlan;
  coach: PublicGymCoach | null;
  paymentMethod: JoinPaymentMethod;
  paymentRef: string;
}

function parseDurationDays(durationLabel: string) {
  const match = durationLabel.match(/(\d+)/);
  return match ? Number(match[1]) : 30;
}

export function buildCompletedMembership({
  profile,
  plan,
  coach,
  paymentMethod,
  paymentRef,
}: BuildMembershipInput): CompletedMembership {
  return {
    gymId: profile.id,
    gymName: profile.name,
    planId: plan.id,
    planName: plan.name,
    planPrice: plan.price,
    coachId: coach?.id ?? null,
    coachName: coach?.name ?? null,
    coachSessionPrice: coach?.sessionPrice ?? 0,
    paymentMethod,
    paymentRef,
    totalPaid: plan.price,
    joinedAt: new Date().toISOString(),
    durationDays: parseDurationDays(plan.durationLabel),
  };
}

import { daysRemainingUntil } from "@/utils/ownerPlan";
import { ListLiveMembershipsService } from "@/services/gym/list-live-memberships-service";

export function ShapeEnrolledMembershipService(
  m: Awaited<ReturnType<typeof ListLiveMembershipsService>>[number],
  activeGymId: string | null,
) {
  const planName = m.planName || m.plan?.name || "Plan";
  const planPrice = m.planPrice > 0 ? m.planPrice : (m.plan?.price ?? 0);
  const durationDays = m.durationDays > 0 ? m.durationDays : (m.plan?.durationDays ?? 0);
  const remainingDays = daysRemainingUntil(m.expiresAt);
  const planType = String(m.memberType || "").toUpperCase() === "ONLINE" ? "Online" : "Walk-in";
  const isExpired = m.status === "EXPIRED" || remainingDays <= 0;
  const status = isExpired ? "Expired" : remainingDays <= 5 ? "Expiring" : "Active";

  return {
    membershipId: m.id,
    gymId: m.gymId,
    gymName: m.gym.name,
    gymAddress: m.gym.address || "",
    coverImageUrl: m.gym.coverImageUrl || "",
    planId: m.planId,
    planName,
    planPrice,
    planType,
    durationDays,
    remainingDays: isExpired ? 0 : remainingDays,
    status,
    memberType: m.memberType,
    paymentMethod: m.paymentMethod,
    paymentRef: m.paymentRef,
    totalPaid: m.totalPaid,
    coachId: m.coachId,
    coachName: m.coach?.name || null,
    coachSessionPrice: m.coach?.sessionPrice || 0,
    joinedAt: m.joinedAt.toISOString(),
    expiresAt: m.expiresAt.toISOString(),
    isCurrent: !isExpired && activeGymId === m.gymId,
  };
}

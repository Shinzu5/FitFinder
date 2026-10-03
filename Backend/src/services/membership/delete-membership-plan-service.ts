import { MembershipRepository } from "@/repositories/membership.repository";
import { EmitMembershipPlansUpdatedService as emitMembershipPlansUpdated } from "@/services/realtime/emit-membership-plans-updated-service";
import { EmitWalkInStatusService as emitWalkInStatus } from "@/services/realtime/emit-walk-in-status-service";
import { EmitWalkInApprovalsUpdatedService as emitWalkInApprovalsUpdated } from "@/services/realtime/emit-walk-in-approvals-updated-service";

const membershipRepository = new MembershipRepository();

type DeleteMembershipPlanResult = { kind: "not-found" } | { kind: "ok" };

/**
 * DELETE /api/owner/membership-plans/:id
 * Soft-delete: hide from new purchases; existing paid members keep access
 * until expiresAt. Pending walk-ins on the plan are declined in the same
 * atomic unit, then every affected party is notified live.
 */
export async function DeleteMembershipPlanService(input: {
  gymId: string;
  planId: string;
}): Promise<DeleteMembershipPlanResult> {
  const existing = await membershipRepository.findPlan({
    where: { id: input.planId, gymId: input.gymId, isActive: true },
  });
  if (!existing) {
    return { kind: "not-found" };
  }

  const declinedPending = await membershipRepository.softDeletePlanDecliningPending({
    id: existing.id,
    name: existing.name,
    price: existing.price,
    durationDays: existing.durationDays,
  });

  for (const p of declinedPending) {
    emitWalkInStatus(p.userId, {
      id: p.id,
      userId: p.userId,
      memberName: p.memberName,
      memberEmail: p.memberEmail,
      gymId: p.gymId,
      gymName: p.gym.name,
      planId: p.planId,
      planName: existing.name,
      planPrice: existing.price,
      coachId: p.coachId,
      coachName: p.coachName,
      coachSessionPrice: p.coachSessionPrice,
      paymentRef: p.paymentRef,
      totalPaid: p.totalPaid,
      durationDays: p.durationDays,
      paymentStatus: String(p.paymentStatus || "PAID").toLowerCase(),
      approvalStatus: "declined",
      status: "declined",
      rejectionReason: "Membership plan was removed by the gym owner.",
      submittedAt: p.submittedAt.getTime(),
      reviewedAt: Date.now(),
      consumedAt: p.consumedAt?.getTime() ?? null,
    });
  }
  if (declinedPending.length > 0) {
    void emitWalkInApprovalsUpdated(input.gymId);
  }

  void emitMembershipPlansUpdated(input.gymId);

  return { kind: "ok" };
}

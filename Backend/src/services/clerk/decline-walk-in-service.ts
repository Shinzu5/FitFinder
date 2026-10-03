import { ApprovalRepository } from "@/repositories/approval.repository";
import { GetStaffGymService } from "@/services/gym/get-staff-gym-service";
import { EmitWalkInStatusService as emitWalkInStatus } from "@/services/realtime/emit-walk-in-status-service";
import { EmitWalkInApprovalsUpdatedService as emitWalkInApprovalsUpdated } from "@/services/realtime/emit-walk-in-approvals-updated-service";
import { NotifyMembershipRejectedService as notifyMembershipRejected } from "@/services/membership/notify-membership-rejected-service";

const approvalRepository = new ApprovalRepository();

type DeclinePayload = {
  id: string;
  userId: string;
  memberName: string;
  memberEmail: string;
  gymId: string;
  gymName: string;
  planId: string | null;
  planName: string;
  planPrice: number;
  coachId: string | null;
  coachName: string | null;
  coachSessionPrice: number;
  paymentRef: string;
  totalPaid: number;
  durationDays: number;
  paymentStatus: string;
  approvalStatus: string;
  status: string;
  rejectionReason: string;
  submittedAt: number;
  reviewedAt: number | null;
  consumedAt: number | null;
};

type DeclineWalkInResult =
  | { kind: "not-found" }
  | { kind: "already-processed" }
  | { kind: "forbidden" }
  | { kind: "ok"; payload: DeclinePayload };

/**
 * PUT /api/clerk/approvals/:id/decline — PENDING → DECLINED with a reason,
 * then notify the gymer and refresh the gym's approval feed.
 */
export async function DeclineWalkInService(input: {
  approvalId: string;
  actorId: string;
  reason?: any;
}): Promise<DeclineWalkInResult> {
  const approval = await approvalRepository.findByIdWithPlanAndGym(input.approvalId);

  if (!approval) {
    return { kind: "not-found" };
  }
  if (approval.status !== "PENDING") {
    return { kind: "already-processed" };
  }

  const gym = await GetStaffGymService(input.actorId);
  if (!gym || gym.id !== approval.gymId) {
    return { kind: "forbidden" };
  }

  const reason = String(input.reason || "").trim();

  const updated = await approvalRepository.updateApproval({
    where: { id: input.approvalId },
    data: {
      status: "DECLINED",
      reviewedAt: new Date(),
      rejectionReason: reason || "Request declined by gym staff",
    },
    include: {
      plan: { select: { name: true, price: true } },
      gym: { select: { name: true } },
    },
  });

  const payload: DeclinePayload = {
    id: updated.id,
    userId: updated.userId,
    memberName: updated.memberName,
    memberEmail: updated.memberEmail,
    gymId: updated.gymId,
    gymName: updated.gym.name,
    planId: updated.planId,
    planName: updated.planName || updated.plan?.name || "",
    planPrice: updated.planPrice > 0 ? updated.planPrice : updated.plan?.price ?? 0,
    coachId: updated.coachId,
    coachName: updated.coachName,
    coachSessionPrice: updated.coachSessionPrice,
    paymentRef: updated.paymentRef,
    totalPaid: updated.totalPaid,
    durationDays: updated.durationDays,
    paymentStatus: String((updated as any).paymentStatus || "PAID").toLowerCase(),
    approvalStatus: "declined",
    status: "declined",
    rejectionReason: (updated as any).rejectionReason || "",
    submittedAt: updated.submittedAt.getTime(),
    reviewedAt: updated.reviewedAt?.getTime() ?? null,
    consumedAt: updated.consumedAt?.getTime() ?? null,
  };

  emitWalkInStatus(updated.userId, payload);
  void emitWalkInApprovalsUpdated(updated.gymId);
  void notifyMembershipRejected({
    userId: updated.userId,
    gymId: updated.gymId,
    gymName: updated.gym.name,
    approvalId: updated.id,
    reason: updated.rejectionReason || reason,
  });

  return { kind: "ok", payload };
}

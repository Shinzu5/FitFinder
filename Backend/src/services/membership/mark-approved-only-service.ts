import { ApprovalRepository } from "@/repositories/approval.repository";
import { EmitWalkInStatusService as emitWalkInStatus } from "@/services/realtime/emit-walk-in-status-service";
import { EmitWalkInApprovalsUpdatedService as emitWalkInApprovalsUpdated } from "@/services/realtime/emit-walk-in-approvals-updated-service";
import { ShapeApprovalPayloadService as shapeApprovalPayload } from "@/services/membership/shape-approval-payload-service";
import { HasLiveMembershipAtGymService as hasLiveMembershipAtGym } from "@/services/membership/has-live-membership-at-gym-service";
import { NotifyMembershipApprovedService as notifyMembershipApproved } from "@/services/membership/notify-membership-approved-service";

const approvalRepository = new ApprovalRepository();

/**
 * Staff Approve: PENDING → APPROVED only.
 * Never upserts membership. Never sets consumedAt. Never starts remaining days.
 */
export async function MarkApprovedOnlyService(opts: {
  approvalId: string;
  actorId: string;
}) {
  const approval = await approvalRepository.findByIdWithPlan(opts.approvalId);
  if (!approval) {
    return { ok: false as const, status: 404, message: "Not found" };
  }
  if (approval.status !== "PENDING") {
    return { ok: false as const, status: 400, message: "Already processed" };
  }

  const now = new Date();
  const isRenewal =
    Boolean(approval.isRenewal) ||
    (await hasLiveMembershipAtGym(approval.userId, approval.gymId));

  const updated = await approvalRepository.updateApproval({
    where: { id: approval.id },
    data: {
      status: "APPROVED",
      reviewedAt: now,
      paymentStatus: "PAID",
      isRenewal,
      consumedAt: null,
    },
    include: {
      plan: { select: { name: true, price: true } },
      gym: { select: { name: true } },
    },
  });

  const shaped = shapeApprovalPayload(updated);
  emitWalkInStatus(updated.userId, shaped);
  void emitWalkInApprovalsUpdated(updated.gymId);
  void notifyMembershipApproved({
    userId: updated.userId,
    gymId: updated.gymId,
    gymName: shaped.gymName,
    approvalId: updated.id,
    isRenewal,
  });

  return { ok: true as const, approval: updated, shaped, isRenewal };
}

import { ApprovalRepository } from "@/repositories/approval.repository";
import { EmitWalkInStatusService as emitWalkInStatus } from "@/services/realtime/emit-walk-in-status-service";
import { EmitWalkInApprovalsUpdatedService as emitWalkInApprovalsUpdated } from "@/services/realtime/emit-walk-in-approvals-updated-service";
import { ShapeApprovalPayloadService as shapeApprovalPayload } from "@/services/membership/shape-approval-payload-service";
import { NotifyMembershipRequestSubmittedService as notifyMembershipRequestSubmitted } from "@/services/membership/notify-membership-request-submitted-service";

const approvalRepository = new ApprovalRepository();

type ApprovalPaymentMethod = "WALK_IN" | "XENDIT";

type CreatePendingApprovalInput = {
  userId: string;
  gymId: string;
  planId: string;
  planName: string;
  planPrice: number;
  memberName: string;
  memberEmail: string;
  coachId?: string | null;
  coachName?: string | null;
  coachSessionPrice?: number;
  paymentRef: string;
  totalPaid: number;
  durationDays: number;
  isRenewal: boolean;
  paymentMethod: ApprovalPaymentMethod;
};

/**
 * Create PENDING approval (first join, renewal, multi-gym, walk-in or GCash).
 * Does not create GymMembership.
 */
export async function CreatePendingApprovalService(input: CreatePendingApprovalInput) {
  const approval = await approvalRepository.createApproval({
    data: {
      userId: input.userId,
      gymId: input.gymId,
      planId: input.planId,
      planName: input.planName,
      planPrice: input.planPrice,
      memberName: input.memberName,
      memberEmail: input.memberEmail,
      coachId: input.coachId || null,
      coachName: input.coachName || null,
      coachSessionPrice: input.coachSessionPrice || 0,
      paymentRef: input.paymentRef,
      totalPaid: input.totalPaid,
      durationDays: input.durationDays,
      isRenewal: input.isRenewal,
      paymentMethod: input.paymentMethod,
      paymentStatus: "PAID",
      status: "PENDING",
    },
    include: {
      plan: { select: { name: true, price: true } },
      gym: { select: { name: true } },
    },
  });

  const shaped = shapeApprovalPayload(approval);
  emitWalkInStatus(input.userId, shaped);
  void emitWalkInApprovalsUpdated(input.gymId);
  void notifyMembershipRequestSubmitted({
    userId: input.userId,
    gymId: input.gymId,
    gymName: approval.gym.name,
    approvalId: approval.id,
    memberName: input.memberName,
    isRenewal: input.isRenewal,
    paymentMethod: input.paymentMethod,
  });

  return { approval, shaped };
}

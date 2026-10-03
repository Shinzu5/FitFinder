import { ApprovalRepository } from "@/repositories/approval.repository";
import { MembershipRepository } from "@/repositories/membership.repository";
import { EmitWalkInStatusService as emitWalkInStatus } from "@/services/realtime/emit-walk-in-status-service";
import { EmitWalkInApprovalsUpdatedService as emitWalkInApprovalsUpdated } from "@/services/realtime/emit-walk-in-approvals-updated-service";
import { EmitSalesUpdatedService as emitSalesUpdated } from "@/services/realtime/emit-sales-updated-service";
import { EmitAdminGymsUpdatedService as emitAdminGymsUpdated } from "@/services/realtime/emit-admin-gyms-updated-service";
import { ShapeApprovalPayloadService as shapeApprovalPayload } from "@/services/membership/shape-approval-payload-service";
import { HasLiveMembershipAtGymService as hasLiveMembershipAtGym } from "@/services/membership/has-live-membership-at-gym-service";
import { ComputeExtendedExpiresAtService as computeExtendedExpiresAt } from "@/services/membership/compute-extended-expires-at-service";
import { NotifyMembershipChangeService as notifyMembershipChange } from "@/services/membership/notify-membership-change-service";
import { EnsureActiveGymService as ensureActiveGymIfEmpty } from "@/services/gym/ensure-active-gym-service";
import type { RegisteredBy } from "@/types/membership";

const approvalRepository = new ApprovalRepository();
const membershipRepository = new MembershipRepository();

/**
 * Gymer Done / Clerk complete: APPROVED → ACTIVE membership + consume.
 * Sole place that starts remaining days / members / sales for purchases.
 */
export async function ActivateFromApprovalService(opts: {
  approvalId: string;
  actorId: string;
  registeredBy: RegisteredBy;
}) {
  const approval = await approvalRepository.findByIdWithPlan(opts.approvalId);
  if (!approval) {
    return { ok: false as const, status: 404, message: "Not found" };
  }
  if (approval.status !== "APPROVED") {
    return {
      ok: false as const,
      status: 400,
      message: "Membership is not approved yet",
    };
  }
  if (approval.consumedAt) {
    return {
      ok: false as const,
      status: 400,
      message: "Membership already activated",
    };
  }

  const now = new Date();
  const isRenewal =
    Boolean(approval.isRenewal) ||
    (await hasLiveMembershipAtGym(approval.userId, approval.gymId));
  const payMethodRaw = String(approval.paymentMethod || "WALK_IN").toUpperCase();
  const memberType = payMethodRaw === "XENDIT" ? "ONLINE" : "WALK_IN";
  const txnMethod = payMethodRaw === "XENDIT" ? "XENDIT" : "CASH";

  const existingMembership = await membershipRepository.findLatestScheduleByUserAndGym(
    approval.userId,
    approval.gymId,
  );

  const expiresAt = isRenewal
    ? computeExtendedExpiresAt(existingMembership?.expiresAt, approval.durationDays, now)
    : (() => {
        const d = new Date(now);
        d.setDate(d.getDate() + approval.durationDays);
        return d;
      })();

  let membership;
  try {
    membership = await approvalRepository.activateFromApproval({
      approvalId: approval.id,
      actorId: opts.actorId,
      memberName: approval.memberName,
      txnAmount: approval.totalPaid,
      txnType: isRenewal ? "RENEWAL" : "MONTHLY",
      txnMethod,
      txnNotes: isRenewal
        ? `Membership renewal activated · Ref ${approval.paymentRef}`
        : `Membership activated · Ref ${approval.paymentRef}`,
      isRenewal,
      now,
      membership: {
        userId: approval.userId,
        gymId: approval.gymId,
        planId: approval.planId,
        planName: approval.planName || approval.plan?.name || "",
        planPrice: approval.planPrice || approval.plan?.price || 0,
        durationDays: approval.durationDays,
        coachId: approval.coachId,
        paymentMethod: payMethodRaw === "XENDIT" ? "XENDIT" : "WALK_IN",
        paymentRef: approval.paymentRef,
        totalPaid: approval.totalPaid,
        accumulateTotalPaid: isRenewal,
        memberType,
        registeredBy: opts.registeredBy,
        registeredById: opts.actorId,
        expiresAt,
        startsAt:
          isRenewal && existingMembership?.startsAt
            ? existingMembership.startsAt
            : now,
        status: "ACTIVE",
      },
    });
  } catch (err: any) {
    if (err?.message === "DUPLICATE_PAYMENT_REF") {
      return {
        ok: false as const,
        status: 409,
        message: "This payment was already applied",
      };
    }
    throw err;
  }

  await ensureActiveGymIfEmpty(approval.userId, approval.gymId);
  await notifyMembershipChange(approval.userId, approval.gymId);
  void emitSalesUpdated(approval.gymId);
  void emitWalkInApprovalsUpdated(approval.gymId);
  void emitAdminGymsUpdated();

  const refreshed = await approvalRepository.findByIdWithPlanAndGym(approval.id);

  const shaped = shapeApprovalPayload(refreshed || approval);
  emitWalkInStatus(approval.userId, shaped);

  return {
    ok: true as const,
    membership,
    approval: refreshed || approval,
    shaped,
    isRenewal,
  };
}

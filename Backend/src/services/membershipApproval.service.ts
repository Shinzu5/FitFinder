import prisma from "../config/database";
import {
  computeExtendedExpiresAt,
  notifyMembershipChange,
  upsertGymMembership,
  type RegisteredBy,
} from "./gymMembership.service";
import {
  emitAdminGymsUpdated,
  emitSalesUpdated,
  emitWalkInApprovalsUpdated,
  emitWalkInStatus,
} from "./realtime.service";
import {
  notifyMembershipApproved,
  notifyMembershipRequestSubmitted,
} from "./membershipNotification.service";
import { ensureActiveGymIfEmpty } from "./activeGym.service";

/**
 * ONE membership approval lifecycle for the whole system:
 * PENDING → APPROVED (staff) → Done / complete → ACTIVE
 *
 * Approve never creates membership. Activation only on Done / clerk complete.
 */

export type ApprovalPaymentMethod = "WALK_IN" | "XENDIT";

export type CreatePendingApprovalInput = {
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

export function shapeApprovalPayload(
  a: {
    id: string;
    userId: string;
    memberName: string;
    memberEmail: string;
    gymId: string;
    planId: string | null;
    planName?: string;
    planPrice?: number;
    coachId: string | null;
    coachName: string | null;
    coachSessionPrice: number;
    paymentRef: string;
    totalPaid: number;
    durationDays: number;
    isRenewal?: boolean;
    paymentMethod?: string | null;
    status: string;
    paymentStatus?: string | null;
    rejectionReason?: string | null;
    submittedAt: Date;
    reviewedAt: Date | null;
    consumedAt: Date | null;
    plan?: { name: string; price: number } | null;
    gym?: { name: string } | null;
  },
  gymNameFallback?: string,
) {
  const method = String(a.paymentMethod || "WALK_IN").toUpperCase();
  return {
    id: a.id,
    userId: a.userId,
    memberName: a.memberName,
    memberEmail: a.memberEmail,
    gymId: a.gymId,
    gymName: a.gym?.name || gymNameFallback || "",
    planId: a.planId,
    planName: a.planName || a.plan?.name || "",
    planPrice: a.planPrice && a.planPrice > 0 ? a.planPrice : a.plan?.price ?? 0,
    coachId: a.coachId,
    coachName: a.coachName,
    coachSessionPrice: a.coachSessionPrice,
    paymentRef: a.paymentRef,
    totalPaid: a.totalPaid,
    durationDays: a.durationDays,
    isRenewal: Boolean(a.isRenewal),
    paymentMethod: method === "XENDIT" ? "Cashless" : "Walk-in",
    paymentMethodRaw: method,
    paymentStatus: String(a.paymentStatus || "PAID").toLowerCase(),
    approvalStatus: String(a.status).toLowerCase(),
    status: String(a.status).toLowerCase(),
    rejectionReason: a.rejectionReason || "",
    submittedAt: a.submittedAt.getTime(),
    reviewedAt: a.reviewedAt?.getTime() ?? null,
    consumedAt: a.consumedAt?.getTime() ?? null,
    renewalDate: a.submittedAt.getTime(),
  };
}

/** True when user has a live membership at this gym (renewal vs new join). */
export async function hasLiveMembershipAtGym(
  userId: string,
  gymId: string,
): Promise<boolean> {
  const row = await prisma.gymMembership.findFirst({
    where: {
      userId,
      gymId,
      status: { in: ["ACTIVE", "EXPIRING"] },
      expiresAt: { gt: new Date() },
    },
    select: { id: true },
  });
  return Boolean(row);
}

/**
 * Create PENDING approval (first join, renewal, multi-gym, walk-in or GCash).
 * Does not create GymMembership.
 */
export async function createPendingApproval(input: CreatePendingApprovalInput) {
  const approval = await prisma.walkInApproval.create({
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

/**
 * Staff Approve: PENDING → APPROVED only.
 * Never upserts membership. Never sets consumedAt. Never starts remaining days.
 */
export async function markApprovedOnly(opts: {
  approvalId: string;
  actorId: string;
}) {
  const approval = await prisma.walkInApproval.findUnique({
    where: { id: opts.approvalId },
    include: { plan: true, gym: { select: { name: true } } },
  });
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

  const updated = await prisma.walkInApproval.update({
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

/**
 * Gymer Done / Clerk complete: APPROVED → ACTIVE membership + consume.
 * Sole place that starts remaining days / members / sales for purchases.
 */
export async function activateFromApproval(opts: {
  approvalId: string;
  actorId: string;
  registeredBy: RegisteredBy;
}) {
  const approval = await prisma.walkInApproval.findUnique({
    where: { id: opts.approvalId },
    include: { plan: true, gym: { select: { name: true } } },
  });
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

  const existingMembership = await prisma.gymMembership.findFirst({
    where: { userId: approval.userId, gymId: approval.gymId },
    orderBy: { joinedAt: "desc" },
    select: { expiresAt: true, startsAt: true },
  });

  const expiresAt = isRenewal
    ? computeExtendedExpiresAt(existingMembership?.expiresAt, approval.durationDays, now)
    : (() => {
        const d = new Date(now);
        d.setDate(d.getDate() + approval.durationDays);
        return d;
      })();

  let membership;
  try {
    membership = await prisma.$transaction(async (tx) => {
      const dupTxn = await tx.clerkTransaction.findFirst({
        where: {
          gymId: approval.gymId,
          notes: { contains: approval.paymentRef },
        },
        select: { id: true },
      });
      if (dupTxn) {
        throw new Error("DUPLICATE_PAYMENT_REF");
      }

      let liveCoachId: string | null = approval.coachId;
      if (approval.coachId) {
        const liveCoach = await tx.coach.findFirst({
          where: {
            id: approval.coachId,
            gymId: approval.gymId,
            isActive: true,
          },
          select: { id: true },
        });
        if (!liveCoach) liveCoachId = null;
      }

      const mem = await upsertGymMembership(
        {
          userId: approval.userId,
          gymId: approval.gymId,
          planId: approval.planId,
          planName: approval.planName || approval.plan?.name || "",
          planPrice: approval.planPrice || approval.plan?.price || 0,
          durationDays: approval.durationDays,
          coachId: liveCoachId,
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
        tx,
      );

      await tx.clerkTransaction.create({
        data: {
          gymId: approval.gymId,
          clerkId: opts.actorId,
          type: isRenewal ? "RENEWAL" : "MONTHLY",
          memberName: approval.memberName,
          amount: approval.totalPaid,
          method: txnMethod as "CASH" | "XENDIT",
          notes: isRenewal
            ? `Membership renewal activated · Ref ${approval.paymentRef}`
            : `Membership activated · Ref ${approval.paymentRef}`,
        },
      });

      await tx.walkInApproval.update({
        where: { id: approval.id },
        data: {
          consumedAt: now,
          isRenewal,
          paymentStatus: "PAID",
        },
      });

      return mem;
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

  const refreshed = await prisma.walkInApproval.findUnique({
    where: { id: approval.id },
    include: {
      plan: { select: { name: true, price: true } },
      gym: { select: { name: true } },
    },
  });

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

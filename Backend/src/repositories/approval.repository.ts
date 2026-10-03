import { Prisma } from "@prisma/client";
import prisma from "@/config/database";
import { upsertGymMembershipRowTx } from "@/repositories/membership.repository";
import type { UpsertGymMembershipRowInput } from "@/types/membership";

/**
 * WalkInApproval CRUD + hasLiveMembership helpers.
 * Mirrors the queries used by membershipApproval.service, user/clerk/owner/admin
 * controllers and payment activation.
 */
export class ApprovalRepository {
  // ─── Generic passthroughs ───────────────────────────────────────────────────

  async findApprovals(args: Prisma.WalkInApprovalFindManyArgs) {
    return prisma.walkInApproval.findMany(args);
  }

  async findApproval(args: Prisma.WalkInApprovalFindFirstArgs) {
    return prisma.walkInApproval.findFirst(args);
  }

  async findApprovalById(
    args: Prisma.WalkInApprovalFindUniqueArgs,
  ) {
    return prisma.walkInApproval.findUnique(args);
  }

  async countApprovals(args: Prisma.WalkInApprovalCountArgs = {}) {
    return prisma.walkInApproval.count(args);
  }

  async createApproval<T extends Prisma.WalkInApprovalCreateArgs>(
    args: T,
  ): Promise<Prisma.WalkInApprovalGetPayload<T>> {
    // Cast: Prisma's SelectSubset parameter prevents payload inference when
    // args is itself generic; runtime query (data + include/select) unchanged.
    return prisma.walkInApproval.create(args) as unknown as Promise<
      Prisma.WalkInApprovalGetPayload<T>
    >;
  }

  async updateApproval<T extends Prisma.WalkInApprovalUpdateArgs>(
    args: T,
  ): Promise<Prisma.WalkInApprovalGetPayload<T>> {
    return prisma.walkInApproval.update(args) as unknown as Promise<
      Prisma.WalkInApprovalGetPayload<T>
    >;
  }

  async updateApprovals(
    args: Prisma.WalkInApprovalUpdateManyArgs,
  ) {
    return prisma.walkInApproval.updateMany(args);
  }

  async deleteApprovals(
    args: Prisma.WalkInApprovalDeleteManyArgs,
  ) {
    return prisma.walkInApproval.deleteMany(args);
  }

  // ─── Named lookups ──────────────────────────────────────────────────────────

  /** Idempotent PENDING request for user+gym (join-gym). */
  async findPendingByUserAndGym(userId: string, gymId: string) {
    return prisma.walkInApproval.findFirst({
      where: { userId, gymId, status: "PENDING" },
      include: {
        plan: { select: { name: true, price: true } },
        gym: { select: { name: true } },
      },
    });
  }

  /** Approved but not yet consumed request (join-gym "click Done" branch). */
  async findApprovedOpenByUserAndGym(
    userId: string,
    gymId: string,
  ) {
    return prisma.walkInApproval.findFirst({
      where: { userId, gymId, status: "APPROVED", consumedAt: null },
      include: {
        plan: { select: { name: true, price: true } },
        gym: { select: { name: true } },
      },
    });
  }

  /** Approval with plan snapshot + gym name (decline / refresh after activate). */
  async findByIdWithPlanAndGym(id: string) {
    return prisma.walkInApproval.findUnique({
      where: { id },
      include: {
        plan: { select: { name: true, price: true } },
        gym: { select: { name: true } },
      },
    });
  }

  /** Approval with full plan relation + gym name (approve / activate). */
  async findByIdWithPlan(id: string) {
    return prisma.walkInApproval.findUnique({
      where: { id },
      include: { plan: true, gym: { select: { name: true } } },
    });
  }

  /** All approvals for a gymer (walk-in status page). */
  async listByUser(userId: string) {
    return prisma.walkInApproval.findMany({
      where: { userId },
      include: {
        gym: { select: { name: true } },
        plan: { select: { name: true, price: true } },
      },
      orderBy: { submittedAt: "desc" },
    });
  }

  /** All approvals for a gym (clerk approvals list). */
  async listByGym(gymId: string) {
    return prisma.walkInApproval.findMany({
      where: { gymId },
      include: { plan: { select: { name: true, price: true } } },
      orderBy: { submittedAt: "desc" },
    });
  }

  /** Approved + unconsumed approvals awaiting cash confirmation. */
  async listOpenApprovedByGym(gymId: string) {
    return prisma.walkInApproval.findMany({
      where: { gymId, status: "APPROVED", consumedAt: null },
      include: { plan: { select: { name: true, price: true } } },
      orderBy: { reviewedAt: "asc" },
    });
  }

  /** Recent approved renewals for the My Membership history list. */
  async listRenewalsByUserAndGym(userId: string, gymId: string) {
    return prisma.walkInApproval.findMany({
      where: { userId, gymId, status: "APPROVED", isRenewal: true },
      orderBy: { reviewedAt: "desc" },
      take: 20,
    });
  }

  /** PENDING approvals for a plan (blocked when the plan is removed). */
  async listPendingByPlan(planId: string) {
    return prisma.walkInApproval.findMany({
      where: { planId, status: "PENDING" },
      include: { gym: { select: { name: true } } },
    });
  }

  /** Approval history for one user (admin detail modal). */
  async listByUserForAdmin(userId: string) {
    return prisma.walkInApproval.findMany({
      where: { userId },
      include: { gym: { select: { id: true, name: true } } },
      orderBy: { submittedAt: "desc" },
    });
  }

  /** Approval already created for this Xendit payment reference. */
  async findByPaymentRef(paymentRef: string) {
    return prisma.walkInApproval.findFirst({
      where: { paymentRef },
      select: { id: true },
    });
  }

  // ─── Snapshots ──────────────────────────────────────────────────────────────

  /** Approvals missing a plan snapshot (backfill from linked plan). */
  async listMissingPlanSnapshots() {
    return prisma.walkInApproval.findMany({
      where: {
        planId: { not: null },
        OR: [{ planName: "" }, { planPrice: 0 }],
      },
      include: { plan: { select: { name: true, price: true } } },
    });
  }

  async updatePlanSnapshot(
    id: string,
    snapshot: { planName: string; planPrice: number },
  ) {
    return prisma.walkInApproval.update({ where: { id }, data: snapshot });
  }

  // ─── hasLiveMembership helpers ──────────────────────────────────────────────

  /** Live membership row (id) for user+gym — renewal detection. */
  async findLiveMembership(userId: string, gymId: string) {
    return prisma.gymMembership.findFirst({
      where: {
        userId,
        gymId,
        status: { in: ["ACTIVE", "EXPIRING"] },
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
    });
  }

  /** True when the user still has a live membership at this gym. */
  async hasLiveMembership(userId: string, gymId: string) {
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

  // ─── Activation transaction ─────────────────────────────────────────────────

  /**
   * Gymer Done / Clerk complete: APPROVED → ACTIVE membership + consume.
   * One atomic round of queries (was prisma.$transaction in
   * activate-from-approval-service): duplicate-payment guard, live-coach check,
   * membership upsert, clerk transaction row and approval consumption.
   * Throws Error("DUPLICATE_PAYMENT_REF") when the reference was already applied.
   */
  async activateFromApproval(args: {
    approvalId: string;
    actorId: string;
    memberName: string;
    txnAmount: number;
    txnType: "RENEWAL" | "MONTHLY";
    txnMethod: "CASH" | "XENDIT";
    txnNotes: string;
    isRenewal: boolean;
    now: Date;
    membership: UpsertGymMembershipRowInput;
  }) {
    return prisma.$transaction(async (tx) => {
      const dupTxn = await tx.clerkTransaction.findFirst({
        where: {
          gymId: args.membership.gymId,
          notes: { contains: args.membership.paymentRef },
        },
        select: { id: true },
      });
      if (dupTxn) {
        throw new Error("DUPLICATE_PAYMENT_REF");
      }

      let liveCoachId: string | null = args.membership.coachId ?? null;
      if (args.membership.coachId) {
        const liveCoach = await tx.coach.findFirst({
          where: {
            id: args.membership.coachId,
            gymId: args.membership.gymId,
            isActive: true,
          },
          select: { id: true },
        });
        if (!liveCoach) liveCoachId = null;
      }

      const mem = await upsertGymMembershipRowTx(tx, {
        ...args.membership,
        coachId: liveCoachId,
      });

      await tx.clerkTransaction.create({
        data: {
          gymId: args.membership.gymId,
          clerkId: args.actorId,
          type: args.txnType,
          memberName: args.memberName,
          amount: args.txnAmount,
          method: args.txnMethod,
          notes: args.txnNotes,
        },
      });

      await tx.walkInApproval.update({
        where: { id: args.approvalId },
        data: {
          consumedAt: args.now,
          isRenewal: args.isRenewal,
          paymentStatus: "PAID",
        },
      });

      return mem;
    });
  }
}

import { Prisma } from "@prisma/client";
import prisma from "../config/database";

export type Tx = typeof prisma | Prisma.TransactionClient;

/**
 * WalkInApproval CRUD + hasLiveMembership helpers.
 * Mirrors the queries used by membershipApproval.service, user/clerk/owner/admin
 * controllers and payment activation.
 */
export class ApprovalRepository {
  // ─── Generic passthroughs ───────────────────────────────────────────────────

  async findApprovals(args: Prisma.WalkInApprovalFindManyArgs, tx: Tx = prisma) {
    return tx.walkInApproval.findMany(args);
  }

  async findApproval(args: Prisma.WalkInApprovalFindFirstArgs, tx: Tx = prisma) {
    return tx.walkInApproval.findFirst(args);
  }

  async findApprovalById(
    args: Prisma.WalkInApprovalFindUniqueArgs,
    tx: Tx = prisma,
  ) {
    return tx.walkInApproval.findUnique(args);
  }

  async countApprovals(args: Prisma.WalkInApprovalCountArgs = {}, tx: Tx = prisma) {
    return tx.walkInApproval.count(args);
  }

  async createApproval(args: Prisma.WalkInApprovalCreateArgs, tx: Tx = prisma) {
    return tx.walkInApproval.create(args);
  }

  async updateApproval(args: Prisma.WalkInApprovalUpdateArgs, tx: Tx = prisma) {
    return tx.walkInApproval.update(args);
  }

  async updateApprovals(
    args: Prisma.WalkInApprovalUpdateManyArgs,
    tx: Tx = prisma,
  ) {
    return tx.walkInApproval.updateMany(args);
  }

  async deleteApprovals(
    args: Prisma.WalkInApprovalDeleteManyArgs,
    tx: Tx = prisma,
  ) {
    return tx.walkInApproval.deleteMany(args);
  }

  // ─── Named lookups ──────────────────────────────────────────────────────────

  /** Idempotent PENDING request for user+gym (join-gym). */
  async findPendingByUserAndGym(userId: string, gymId: string, tx: Tx = prisma) {
    return tx.walkInApproval.findFirst({
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
    tx: Tx = prisma,
  ) {
    return tx.walkInApproval.findFirst({
      where: { userId, gymId, status: "APPROVED", consumedAt: null },
      include: {
        plan: { select: { name: true, price: true } },
        gym: { select: { name: true } },
      },
    });
  }

  /** Approval with plan snapshot + gym name (decline / refresh after activate). */
  async findByIdWithPlanAndGym(id: string, tx: Tx = prisma) {
    return tx.walkInApproval.findUnique({
      where: { id },
      include: {
        plan: { select: { name: true, price: true } },
        gym: { select: { name: true } },
      },
    });
  }

  /** Approval with full plan relation + gym name (approve / activate). */
  async findByIdWithPlan(id: string, tx: Tx = prisma) {
    return tx.walkInApproval.findUnique({
      where: { id },
      include: { plan: true, gym: { select: { name: true } } },
    });
  }

  /** All approvals for a gymer (walk-in status page). */
  async listByUser(userId: string, tx: Tx = prisma) {
    return tx.walkInApproval.findMany({
      where: { userId },
      include: {
        gym: { select: { name: true } },
        plan: { select: { name: true, price: true } },
      },
      orderBy: { submittedAt: "desc" },
    });
  }

  /** All approvals for a gym (clerk approvals list). */
  async listByGym(gymId: string, tx: Tx = prisma) {
    return tx.walkInApproval.findMany({
      where: { gymId },
      include: { plan: { select: { name: true, price: true } } },
      orderBy: { submittedAt: "desc" },
    });
  }

  /** Approved + unconsumed approvals awaiting cash confirmation. */
  async listOpenApprovedByGym(gymId: string, tx: Tx = prisma) {
    return tx.walkInApproval.findMany({
      where: { gymId, status: "APPROVED", consumedAt: null },
      include: { plan: { select: { name: true, price: true } } },
      orderBy: { reviewedAt: "asc" },
    });
  }

  /** Recent approved renewals for the My Membership history list. */
  async listRenewalsByUserAndGym(userId: string, gymId: string, tx: Tx = prisma) {
    return tx.walkInApproval.findMany({
      where: { userId, gymId, status: "APPROVED", isRenewal: true },
      orderBy: { reviewedAt: "desc" },
      take: 20,
    });
  }

  /** PENDING approvals for a plan (blocked when the plan is removed). */
  async listPendingByPlan(planId: string, tx: Tx = prisma) {
    return tx.walkInApproval.findMany({
      where: { planId, status: "PENDING" },
      include: { gym: { select: { name: true } } },
    });
  }

  /** Approval history for one user (admin detail modal). */
  async listByUserForAdmin(userId: string, tx: Tx = prisma) {
    return tx.walkInApproval.findMany({
      where: { userId },
      include: { gym: { select: { id: true, name: true } } },
      orderBy: { submittedAt: "desc" },
    });
  }

  /** Approval already created for this Xendit payment reference. */
  async findByPaymentRef(paymentRef: string, tx: Tx = prisma) {
    return tx.walkInApproval.findFirst({
      where: { paymentRef },
      select: { id: true },
    });
  }

  // ─── Snapshots ──────────────────────────────────────────────────────────────

  /** Approvals missing a plan snapshot (backfill from linked plan). */
  async listMissingPlanSnapshots(tx: Tx = prisma) {
    return tx.walkInApproval.findMany({
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
    tx: Tx = prisma,
  ) {
    return tx.walkInApproval.update({ where: { id }, data: snapshot });
  }

  // ─── hasLiveMembership helpers ──────────────────────────────────────────────

  /** Live membership row (id) for user+gym — renewal detection. */
  async findLiveMembership(userId: string, gymId: string, tx: Tx = prisma) {
    return tx.gymMembership.findFirst({
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
  async hasLiveMembership(userId: string, gymId: string, tx: Tx = prisma) {
    const row = await tx.gymMembership.findFirst({
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
}

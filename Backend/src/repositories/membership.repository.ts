import { Prisma } from "@prisma/client";
import prisma from "@/config/database";
import type { UpsertGymMembershipRowInput } from "@/types/membership";

/**
 * GymMembership + MembershipPlan CRUD, live/overdue queries and plan snapshots.
 * Methods are 1:1 mirrors of the Prisma queries used by membership/attendance/
 * owner/clerk/admin/user flows.
 */
export class MembershipRepository {
  // ─── GymMembership: generic passthroughs ────────────────────────────────────

  async findMemberships(args: Prisma.GymMembershipFindManyArgs) {
    return prisma.gymMembership.findMany(args);
  }

  async findMembership(args: Prisma.GymMembershipFindFirstArgs) {
    return prisma.gymMembership.findFirst(args);
  }

  async findMembershipById(
    args: Prisma.GymMembershipFindUniqueArgs,
  ) {
    return prisma.gymMembership.findUnique(args);
  }

  async countMemberships(args: Prisma.GymMembershipCountArgs = {}) {
    return prisma.gymMembership.count(args);
  }

  async createMembership(
    args: Prisma.GymMembershipCreateArgs,
  ) {
    return prisma.gymMembership.create(args);
  }

  async updateMembership(args: Prisma.GymMembershipUpdateArgs) {
    return prisma.gymMembership.update(args);
  }

  async updateMemberships(
    args: Prisma.GymMembershipUpdateManyArgs,
  ) {
    return prisma.gymMembership.updateMany(args);
  }

  async deleteMembership(args: Prisma.GymMembershipDeleteArgs) {
    return prisma.gymMembership.delete(args);
  }

  async deleteMemberships(
    args: Prisma.GymMembershipDeleteManyArgs,
  ) {
    return prisma.gymMembership.deleteMany(args);
  }

  // ─── GymMembership: live / overdue / list queries ────────────────────────────

  /** Latest membership row for user+gym (upsert dedupe / renewal checks). */
  async listByUserAndGym(userId: string, gymId: string) {
    return prisma.gymMembership.findMany({
      where: { userId, gymId },
      orderBy: { joinedAt: "desc" },
      select: { id: true, totalPaid: true, joinedAt: true },
    });
  }

  /** Live membership (ACTIVE/EXPIRING, not past expiresAt) at one gym. */
  async findLiveByUserAndGym(userId: string, gymId: string) {
    return prisma.gymMembership.findFirst({
      where: {
        userId,
        gymId,
        status: { in: ["ACTIVE", "EXPIRING"] },
        expiresAt: { gt: new Date() },
      },
      orderBy: { joinedAt: "desc" },
    });
  }

  /** Renewal probe: status/expiry of the live row for user+gym (join-gym). */
  async findLiveSnapshotByUserAndGym(userId: string, gymId: string) {
    return prisma.gymMembership.findFirst({
      where: {
        userId,
        gymId,
        status: { in: ["ACTIVE", "EXPIRING"] },
        expiresAt: { gt: new Date() },
      },
      orderBy: { joinedAt: "desc" },
      select: { id: true, status: true, expiresAt: true },
    });
  }

  /** Live membership at a gym with gym/plan/coach relations (My Membership). */
  async findLiveByUserAndGymWithRelations(
    userId: string,
    gymId: string,
  ) {
    return prisma.gymMembership.findFirst({
      where: {
        userId,
        gymId,
        status: { in: ["ACTIVE", "EXPIRING"] },
        expiresAt: { gt: new Date() },
      },
      include: {
        gym: { select: { id: true, name: true, coverImageUrl: true } },
        plan: { select: { name: true, price: true, durationDays: true } },
        coach: { select: { name: true, sessionPrice: true } },
      },
      orderBy: { joinedAt: "desc" },
    });
  }

  /** Live membership used by member check-in (needs member full name). */
  async findLiveForCheckIn(gymId: string, userId: string) {
    return prisma.gymMembership.findFirst({
      where: {
        gymId,
        userId,
        status: { in: ["ACTIVE", "EXPIRING"] },
        expiresAt: { gt: new Date() },
      },
      include: { user: { select: { fullName: true } } },
    });
  }

  /** Newest membership for user+gym regardless of status (activation flow). */
  async findLatestByUserAndGym(userId: string, gymId: string) {
    return prisma.gymMembership.findFirst({
      where: { userId, gymId },
      orderBy: { joinedAt: "desc" },
    });
  }

  /** Renewal schedule probe: expiresAt/startsAt of the newest row for user+gym. */
  async findLatestScheduleByUserAndGym(userId: string, gymId: string) {
    return prisma.gymMembership.findFirst({
      where: { userId, gymId },
      orderBy: { joinedAt: "desc" },
      select: { expiresAt: true, startsAt: true },
    });
  }

  /** Any membership at the gym, no expiry filter (leave / idempotent Done). */
  async findAnyByUserAndGym(userId: string, gymId: string) {
    return prisma.gymMembership.findFirst({
      where: {
        userId,
        gymId,
        status: { in: ["ACTIVE", "EXPIRING"] },
      },
    });
  }

  /** All live memberships for a user across gyms (Enrolled Gyms switcher). */
  async listLiveByUser(userId: string) {
    return prisma.gymMembership.findMany({
      where: {
        userId,
        status: { in: ["ACTIVE", "EXPIRING"] },
        expiresAt: { gt: new Date() },
      },
      include: {
        gym: { select: { id: true, name: true, coverImageUrl: true, address: true } },
        plan: { select: { name: true, price: true, durationDays: true } },
        coach: { select: { name: true, sessionPrice: true } },
      },
      orderBy: { joinedAt: "desc" },
    });
  }

  /** Non-live memberships excluding gyms already returned as live. */
  async listNonLiveByUser(
    userId: string,
    excludeGymIds: string[],
  ) {
    return prisma.gymMembership.findMany({
      where: {
        userId,
        OR: [
          { status: "EXPIRED" },
          { status: { in: ["ACTIVE", "EXPIRING"] }, expiresAt: { lte: new Date() } },
        ],
        ...(excludeGymIds.length > 0 ? { gymId: { notIn: excludeGymIds } } : {}),
      },
      include: {
        gym: { select: { id: true, name: true, coverImageUrl: true, address: true } },
        plan: { select: { name: true, price: true, durationDays: true } },
        coach: { select: { name: true, sessionPrice: true } },
      },
      orderBy: { joinedAt: "desc" },
    });
  }

  /** Overdue ACTIVE/EXPIRING rows (optionally scoped to one user). */
  async listOverdue(userId?: string) {
    return prisma.gymMembership.findMany({
      where: {
        ...(userId ? { userId } : {}),
        status: { in: ["ACTIVE", "EXPIRING"] },
        expiresAt: { lt: new Date() },
      },
      select: {
        id: true,
        userId: true,
        gymId: true,
        gym: { select: { name: true } },
      },
    });
  }

  /** Mark overdue rows EXPIRED (optional user scope, optional reference time). */
  async expireOverdue(userId?: string, now: Date = new Date()) {
    return prisma.gymMembership.updateMany({
      where: {
        ...(userId ? { userId } : {}),
        status: { in: ["ACTIVE", "EXPIRING"] },
        expiresAt: { lt: now },
      },
      data: { status: "EXPIRED" },
    });
  }

  /** Mark overdue rows EXPIRED for a set of users (admin users list). */
  async expireOverdueByUserIds(userIds: string[], now: Date = new Date()) {
    return prisma.gymMembership.updateMany({
      where: {
        userId: { in: userIds },
        status: { in: ["ACTIVE", "EXPIRING"] },
        expiresAt: { lt: now },
      },
      data: { status: "EXPIRED" },
    });
  }

  /** Mark specific rows EXPIRED by id. */
  async expireByIds(ids: string[]) {
    return prisma.gymMembership.updateMany({
      where: { id: { in: ids } },
      data: { status: "EXPIRED" },
    });
  }

  /** Auto-expire overdue rows scoped to one gym (members list). */
  async expireOverdueByGym(gymId: string) {
    return prisma.gymMembership.updateMany({
      where: {
        gymId,
        status: { in: ["ACTIVE", "EXPIRING"] },
        expiresAt: { lt: new Date() },
      },
      data: { status: "EXPIRED" },
    });
  }

  /** Not-yet-expired live memberships with gym names (expiry reminder jobs). */
  async listLiveForExpiryReminders(now: Date) {
    return prisma.gymMembership.findMany({
      where: {
        status: { in: ["ACTIVE", "EXPIRING"] },
        expiresAt: { gt: now },
      },
      select: {
        id: true,
        userId: true,
        gymId: true,
        expiresAt: true,
        gym: { select: { name: true } },
      },
    });
  }

  /** Members list for a gym (after auto-expiring overdue rows). */
  async listByGymWithMember(gymId: string) {
    return prisma.gymMembership.findMany({
      where: { gymId },
      include: {
        user: { select: { fullName: true, email: true } },
        plan: { select: { name: true, price: true, durationDays: true } },
      },
      orderBy: { joinedAt: "desc" },
    });
  }

  /** Live members for a gym (attendance page). */
  async listLiveByGym(gymId: string, now: Date = new Date()) {
    return prisma.gymMembership.findMany({
      where: {
        gymId,
        status: { in: ["ACTIVE", "EXPIRING"] },
        expiresAt: { gt: now },
      },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        plan: { select: { name: true } },
      },
      orderBy: { joinedAt: "desc" },
    });
  }

  /** Distinct member user ids for gyms (delete-gym kick list). */
  async listDistinctUserIdsByGymIds(gymIds: string[]) {
    return prisma.gymMembership.findMany({
      where: { gymId: { in: gymIds } },
      select: { userId: true },
      distinct: ["userId"],
    });
  }

  /** Gymers of these users with a live membership (admin user status). */
  async listLiveDistinctByUserIds(userIds: string[], now: Date = new Date()) {
    return prisma.gymMembership.findMany({
      where: {
        userId: { in: userIds },
        status: { in: ["ACTIVE", "EXPIRING"] },
        expiresAt: { gt: now },
      },
      select: { userId: true },
      distinct: ["userId"],
    });
  }

  /** Membership history for one user (admin detail modal). */
  async listByUserWithGym(userId: string) {
    return prisma.gymMembership.findMany({
      where: { userId },
      include: {
        gym: { select: { id: true, name: true } },
        plan: { select: { name: true } },
      },
      orderBy: { joinedAt: "desc" },
    });
  }

  /** Joins since a date (admin analytics growth chart). */
  async listJoinedSince(since: Date) {
    return prisma.gymMembership.findMany({
      where: { joinedAt: { gte: since } },
      select: { joinedAt: true },
    });
  }

  /** Memberships created since a date for one gym (clerk dashboard new members). */
  async countJoinedSinceByGym(gymId: string, since: Date) {
    return prisma.gymMembership.count({
      where: { gymId, joinedAt: { gte: since } },
    });
  }

  /** Membership already applied for this Xendit payment (idempotent activate). */
  async findByPaymentRef(
    userId: string,
    gymId: string,
    paymentRef: string,
  ) {
    return prisma.gymMembership.findFirst({
      where: { userId, gymId, paymentRef },
      select: { id: true },
    });
  }

  /** Duplicate older rows for user+gym (upsert cleanup). */
  async deleteManyByIds(ids: string[]) {
    return prisma.gymMembership.deleteMany({ where: { id: { in: ids } } });
  }

  async deleteByUser(userId: string) {
    return prisma.gymMembership.deleteMany({ where: { userId } });
  }

  async deleteByGymIds(gymIds: string[]) {
    return prisma.gymMembership.deleteMany({ where: { gymId: { in: gymIds } } });
  }

  // ─── GymMembership: plan snapshots ──────────────────────────────────────────

  /** Memberships missing a plan snapshot (backfill from linked plan). */
  async listMissingPlanSnapshots() {
    return prisma.gymMembership.findMany({
      where: {
        planId: { not: null },
        OR: [{ planName: "" }, { durationDays: 0 }],
      },
      include: {
        plan: { select: { name: true, price: true, durationDays: true } },
      },
    });
  }

  async updatePlanSnapshot(
    id: string,
    snapshot: { planName: string; planPrice: number; durationDays: number },
  ) {
    return prisma.gymMembership.update({ where: { id }, data: snapshot });
  }

  /** Memberships linked to a plan (snapshot fill before plan soft-delete). */
  async listByPlanId(planId: string) {
    return prisma.gymMembership.findMany({
      where: { planId },
      select: { id: true, planName: true, durationDays: true },
    });
  }

  // ─── MembershipPlan: generic passthroughs ───────────────────────────────────

  async findPlans(args: Prisma.MembershipPlanFindManyArgs) {
    return prisma.membershipPlan.findMany(args);
  }

  async findPlan(args: Prisma.MembershipPlanFindFirstArgs) {
    return prisma.membershipPlan.findFirst(args);
  }

  async findPlanById(
    args: Prisma.MembershipPlanFindUniqueArgs,
  ) {
    return prisma.membershipPlan.findUnique(args);
  }

  async countPlans(args: Prisma.MembershipPlanCountArgs = {}) {
    return prisma.membershipPlan.count(args);
  }

  async createPlan(args: Prisma.MembershipPlanCreateArgs) {
    return prisma.membershipPlan.create(args);
  }

  async updatePlan(args: Prisma.MembershipPlanUpdateArgs) {
    return prisma.membershipPlan.update(args);
  }

  async updatePlans(args: Prisma.MembershipPlanUpdateManyArgs) {
    return prisma.membershipPlan.updateMany(args);
  }

  async deletePlans(args: Prisma.MembershipPlanDeleteManyArgs) {
    return prisma.membershipPlan.deleteMany(args);
  }

  // ─── MembershipPlan: named lookups ──────────────────────────────────────────

  /** Active plans for a gym sorted by price (clerk / realtime catalog). */
  async listActiveByGym(gymId: string) {
    return prisma.membershipPlan.findMany({
      where: { gymId, isActive: true },
      orderBy: { price: "asc" },
    });
  }

  /** Active plans with subscriber counts (owner plan management). */
  async listActiveWithCountsByGym(gymId: string) {
    return prisma.membershipPlan.findMany({
      where: { gymId, isActive: true },
      include: { _count: { select: { gymMemberships: true } } },
    });
  }

  /** Active plan lookup (join-gym / clerk register / GCash payment). */
  async findActiveByIdAndGym(
    planId: string,
    gymId: string,
  ) {
    return prisma.membershipPlan.findFirst({
      where: { id: planId, gymId, isActive: true },
    });
  }

  async findPlanByIdOnly(planId: string) {
    return prisma.membershipPlan.findUnique({ where: { id: planId } });
  }

  async createPlanRow(data: Prisma.MembershipPlanCreateArgs["data"]) {
    return prisma.membershipPlan.create({ data });
  }

  async updatePlanRow(
    id: string,
    data: Record<string, unknown>,
  ) {
    return prisma.membershipPlan.update({ where: { id }, data });
  }

  async deletePlansByGymIds(gymIds: string[]) {
    return prisma.membershipPlan.deleteMany({ where: { gymId: { in: gymIds } } });
  }

  /**
   * Soft-delete a plan AND decline everything pending on it in ONE atomic unit
   * (was prisma.$transaction in owner.controller deleteMembershipPlan):
   * snapshot every linked membership, snapshot the plan on its approvals,
   * decline the pending walk-ins, then hide the plan from new purchases.
   * Returns the pending approvals as they were before the decline update —
   * the caller emits a "declined" walk-in status for each of them.
   */
  async softDeletePlanDecliningPending(plan: {
    id: string;
    name: string;
    price: number;
    durationDays: number;
  }) {
    return prisma.$transaction(async (tx) => {
      // Ensure every linked membership has a plan snapshot before hiding the plan
      const members = await tx.gymMembership.findMany({
        where: { planId: plan.id },
        select: { id: true, planName: true, durationDays: true },
      });
      for (const m of members) {
        if (!m.planName || !m.durationDays) {
          await tx.gymMembership.update({
            where: { id: m.id },
            data: {
              planName: plan.name,
              planPrice: plan.price,
              durationDays: plan.durationDays,
            },
          });
        }
      }

      await tx.walkInApproval.updateMany({
        where: { planId: plan.id, planName: "" },
        data: {
          planName: plan.name,
          planPrice: plan.price,
        },
      });

      const pending = await tx.walkInApproval.findMany({
        where: { planId: plan.id, status: "PENDING" },
        include: { gym: { select: { name: true } } },
      });

      // Pending walk-ins for this plan can no longer proceed
      if (pending.length > 0) {
        await tx.walkInApproval.updateMany({
          where: { id: { in: pending.map((p) => p.id) } },
          data: {
            status: "DECLINED",
            rejectionReason: "Membership plan was removed by the gym owner.",
            reviewedAt: new Date(),
            planName: plan.name,
            planPrice: plan.price,
          },
        });
      }

      await tx.membershipPlan.update({
        where: { id: plan.id },
        data: { isActive: false },
      });

      return pending;
    });
  }

  // ─── GymMembership: upsert (one row per user+gym) ──────────────────────────

  /** One membership row per user+gym — update existing instead of duplicating. */
  async upsertGymMembershipRow(data: UpsertGymMembershipRowInput) {
    return upsertGymMembershipRowTx(prisma, data);
  }
}

/**
 * One membership row per user+gym — update existing instead of duplicating.
 * Accepts a caller-owned transaction client so it can join an atomic unit
 * (approval activation, clerk register-member) without opening a nested one.
 */
export async function upsertGymMembershipRowTx(
  tx: Prisma.TransactionClient,
  data: UpsertGymMembershipRowInput,
) {
  const startsAt = data.startsAt ?? new Date();
  const status = data.status ?? "ACTIVE";

  const existingRows = await tx.gymMembership.findMany({
    where: { userId: data.userId, gymId: data.gymId },
    orderBy: { joinedAt: "desc" },
    select: { id: true, totalPaid: true, joinedAt: true },
  });
  const existing = existingRows[0];

  // Keep a single record per user+gym — remove older duplicates
  if (existingRows.length > 1) {
    await tx.gymMembership.deleteMany({
      where: {
        id: { in: existingRows.slice(1).map((r) => r.id) },
      },
    });
  }

  if (existing) {
    const totalPaid = data.accumulateTotalPaid
      ? Number(existing.totalPaid || 0) + Number(data.totalPaid || 0)
      : data.totalPaid;

    return tx.gymMembership.update({
      where: { id: existing.id },
      data: {
        planId: data.planId ?? null,
        planName: data.planName,
        planPrice: data.planPrice,
        durationDays: data.durationDays,
        coachId: data.coachId ?? null,
        paymentMethod: data.paymentMethod,
        paymentRef: data.paymentRef,
        totalPaid,
        memberType: data.memberType,
        registeredBy: data.registeredBy,
        registeredById: data.registeredById ?? null,
        startsAt,
        // Never rewrite the original registration date on renew
        expiresAt: data.expiresAt,
        status,
      },
    });
  }

  return tx.gymMembership.create({
    data: {
      userId: data.userId,
      gymId: data.gymId,
      planId: data.planId ?? null,
      planName: data.planName,
      planPrice: data.planPrice,
      durationDays: data.durationDays,
      coachId: data.coachId ?? null,
      paymentMethod: data.paymentMethod,
      paymentRef: data.paymentRef,
      totalPaid: data.totalPaid,
      memberType: data.memberType,
      registeredBy: data.registeredBy,
      registeredById: data.registeredById ?? null,
      startsAt,
      joinedAt: startsAt,
      expiresAt: data.expiresAt,
      status,
    },
  });
}

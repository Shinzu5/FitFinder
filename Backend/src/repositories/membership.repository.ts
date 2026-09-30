import { Prisma } from "@prisma/client";
import prisma from "../config/database";

export type Tx = typeof prisma | Prisma.TransactionClient;

/**
 * GymMembership + MembershipPlan CRUD, live/overdue queries and plan snapshots.
 * Methods are 1:1 mirrors of the Prisma queries used by membership/attendance/
 * owner/clerk/admin/user flows.
 */
export class MembershipRepository {
  // ─── GymMembership: generic passthroughs ────────────────────────────────────

  async findMemberships(args: Prisma.GymMembershipFindManyArgs, tx: Tx = prisma) {
    return tx.gymMembership.findMany(args);
  }

  async findMembership(args: Prisma.GymMembershipFindFirstArgs, tx: Tx = prisma) {
    return tx.gymMembership.findFirst(args);
  }

  async findMembershipById(
    args: Prisma.GymMembershipFindUniqueArgs,
    tx: Tx = prisma,
  ) {
    return tx.gymMembership.findUnique(args);
  }

  async countMemberships(args: Prisma.GymMembershipCountArgs = {}, tx: Tx = prisma) {
    return tx.gymMembership.count(args);
  }

  async createMembership(
    args: Prisma.GymMembershipCreateArgs,
    tx: Tx = prisma,
  ) {
    return tx.gymMembership.create(args);
  }

  async updateMembership(args: Prisma.GymMembershipUpdateArgs, tx: Tx = prisma) {
    return tx.gymMembership.update(args);
  }

  async updateMemberships(
    args: Prisma.GymMembershipUpdateManyArgs,
    tx: Tx = prisma,
  ) {
    return tx.gymMembership.updateMany(args);
  }

  async deleteMembership(args: Prisma.GymMembershipDeleteArgs, tx: Tx = prisma) {
    return tx.gymMembership.delete(args);
  }

  async deleteMemberships(
    args: Prisma.GymMembershipDeleteManyArgs,
    tx: Tx = prisma,
  ) {
    return tx.gymMembership.deleteMany(args);
  }

  // ─── GymMembership: live / overdue / list queries ────────────────────────────

  /** Latest membership row for user+gym (upsert dedupe / renewal checks). */
  async listByUserAndGym(userId: string, gymId: string, tx: Tx = prisma) {
    return tx.gymMembership.findMany({
      where: { userId, gymId },
      orderBy: { joinedAt: "desc" },
      select: { id: true, totalPaid: true, joinedAt: true },
    });
  }

  /** Live membership (ACTIVE/EXPIRING, not past expiresAt) at one gym. */
  async findLiveByUserAndGym(userId: string, gymId: string, tx: Tx = prisma) {
    return tx.gymMembership.findFirst({
      where: {
        userId,
        gymId,
        status: { in: ["ACTIVE", "EXPIRING"] },
        expiresAt: { gt: new Date() },
      },
      orderBy: { joinedAt: "desc" },
    });
  }

  /** Live membership at a gym with gym/plan/coach relations (My Membership). */
  async findLiveByUserAndGymWithRelations(
    userId: string,
    gymId: string,
    tx: Tx = prisma,
  ) {
    return tx.gymMembership.findFirst({
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
  async findLiveForCheckIn(gymId: string, userId: string, tx: Tx = prisma) {
    return tx.gymMembership.findFirst({
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
  async findLatestByUserAndGym(userId: string, gymId: string, tx: Tx = prisma) {
    return tx.gymMembership.findFirst({
      where: { userId, gymId },
      orderBy: { joinedAt: "desc" },
    });
  }

  /** Any membership at the gym, no expiry filter (leave / idempotent Done). */
  async findAnyByUserAndGym(userId: string, gymId: string, tx: Tx = prisma) {
    return tx.gymMembership.findFirst({
      where: {
        userId,
        gymId,
        status: { in: ["ACTIVE", "EXPIRING"] },
      },
    });
  }

  /** All live memberships for a user across gyms (Enrolled Gyms switcher). */
  async listLiveByUser(userId: string, tx: Tx = prisma) {
    return tx.gymMembership.findMany({
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
    tx: Tx = prisma,
  ) {
    return tx.gymMembership.findMany({
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
  async listOverdue(userId?: string, tx: Tx = prisma) {
    return tx.gymMembership.findMany({
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

  /** Mark overdue rows EXPIRED (optional user scope). */
  async expireOverdue(userId?: string, tx: Tx = prisma) {
    return tx.gymMembership.updateMany({
      where: {
        ...(userId ? { userId } : {}),
        status: { in: ["ACTIVE", "EXPIRING"] },
        expiresAt: { lt: new Date() },
      },
      data: { status: "EXPIRED" },
    });
  }

  /** Mark specific rows EXPIRED by id. */
  async expireByIds(ids: string[], tx: Tx = prisma) {
    return tx.gymMembership.updateMany({
      where: { id: { in: ids } },
      data: { status: "EXPIRED" },
    });
  }

  /** Members list for a gym (after auto-expiring overdue rows). */
  async listByGymWithMember(gymId: string, tx: Tx = prisma) {
    return tx.gymMembership.findMany({
      where: { gymId },
      include: {
        user: { select: { fullName: true, email: true } },
        plan: { select: { name: true, price: true, durationDays: true } },
      },
      orderBy: { joinedAt: "desc" },
    });
  }

  /** Live members for a gym (attendance page). */
  async listLiveByGym(gymId: string, tx: Tx = prisma) {
    return tx.gymMembership.findMany({
      where: {
        gymId,
        status: { in: ["ACTIVE", "EXPIRING"] },
        expiresAt: { gt: new Date() },
      },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        plan: { select: { name: true } },
      },
      orderBy: { joinedAt: "desc" },
    });
  }

  /** Distinct member user ids for gyms (delete-gym kick list). */
  async listDistinctUserIdsByGymIds(gymIds: string[], tx: Tx = prisma) {
    return tx.gymMembership.findMany({
      where: { gymId: { in: gymIds } },
      select: { userId: true },
      distinct: ["userId"],
    });
  }

  /** Gymers of these users with a live membership (admin user status). */
  async listLiveDistinctByUserIds(userIds: string[], tx: Tx = prisma) {
    return tx.gymMembership.findMany({
      where: {
        userId: { in: userIds },
        status: { in: ["ACTIVE", "EXPIRING"] },
        expiresAt: { gt: new Date() },
      },
      select: { userId: true },
      distinct: ["userId"],
    });
  }

  /** Membership history for one user (admin detail modal). */
  async listByUserWithGym(userId: string, tx: Tx = prisma) {
    return tx.gymMembership.findMany({
      where: { userId },
      include: {
        gym: { select: { id: true, name: true } },
        plan: { select: { name: true } },
      },
      orderBy: { joinedAt: "desc" },
    });
  }

  /** Joins since a date (admin analytics growth chart). */
  async listJoinedSince(since: Date, tx: Tx = prisma) {
    return tx.gymMembership.findMany({
      where: { joinedAt: { gte: since } },
      select: { joinedAt: true },
    });
  }

  /** Membership already applied for this Xendit payment (idempotent activate). */
  async findByPaymentRef(
    userId: string,
    gymId: string,
    paymentRef: string,
    tx: Tx = prisma,
  ) {
    return tx.gymMembership.findFirst({
      where: { userId, gymId, paymentRef },
      select: { id: true },
    });
  }

  /** Duplicate older rows for user+gym (upsert cleanup). */
  async deleteManyByIds(ids: string[], tx: Tx = prisma) {
    return tx.gymMembership.deleteMany({ where: { id: { in: ids } } });
  }

  async deleteByUser(userId: string, tx: Tx = prisma) {
    return tx.gymMembership.deleteMany({ where: { userId } });
  }

  async deleteByGymIds(gymIds: string[], tx: Tx = prisma) {
    return tx.gymMembership.deleteMany({ where: { gymId: { in: gymIds } } });
  }

  // ─── GymMembership: plan snapshots ──────────────────────────────────────────

  /** Memberships missing a plan snapshot (backfill from linked plan). */
  async listMissingPlanSnapshots(tx: Tx = prisma) {
    return tx.gymMembership.findMany({
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
    tx: Tx = prisma,
  ) {
    return tx.gymMembership.update({ where: { id }, data: snapshot });
  }

  /** Memberships linked to a plan (snapshot fill before plan soft-delete). */
  async listByPlanId(planId: string, tx: Tx = prisma) {
    return tx.gymMembership.findMany({
      where: { planId },
      select: { id: true, planName: true, durationDays: true },
    });
  }

  // ─── MembershipPlan: generic passthroughs ───────────────────────────────────

  async findPlans(args: Prisma.MembershipPlanFindManyArgs, tx: Tx = prisma) {
    return tx.membershipPlan.findMany(args);
  }

  async findPlan(args: Prisma.MembershipPlanFindFirstArgs, tx: Tx = prisma) {
    return tx.membershipPlan.findFirst(args);
  }

  async findPlanById(
    args: Prisma.MembershipPlanFindUniqueArgs,
    tx: Tx = prisma,
  ) {
    return tx.membershipPlan.findUnique(args);
  }

  async countPlans(args: Prisma.MembershipPlanCountArgs = {}, tx: Tx = prisma) {
    return tx.membershipPlan.count(args);
  }

  async createPlan(args: Prisma.MembershipPlanCreateArgs, tx: Tx = prisma) {
    return tx.membershipPlan.create(args);
  }

  async updatePlan(args: Prisma.MembershipPlanUpdateArgs, tx: Tx = prisma) {
    return tx.membershipPlan.update(args);
  }

  async updatePlans(args: Prisma.MembershipPlanUpdateManyArgs, tx: Tx = prisma) {
    return tx.membershipPlan.updateMany(args);
  }

  async deletePlans(args: Prisma.MembershipPlanDeleteManyArgs, tx: Tx = prisma) {
    return tx.membershipPlan.deleteMany(args);
  }

  // ─── MembershipPlan: named lookups ──────────────────────────────────────────

  /** Active plans for a gym sorted by price (clerk / realtime catalog). */
  async listActiveByGym(gymId: string, tx: Tx = prisma) {
    return tx.membershipPlan.findMany({
      where: { gymId, isActive: true },
      orderBy: { price: "asc" },
    });
  }

  /** Active plans with subscriber counts (owner plan management). */
  async listActiveWithCountsByGym(gymId: string, tx: Tx = prisma) {
    return tx.membershipPlan.findMany({
      where: { gymId, isActive: true },
      include: { _count: { select: { gymMemberships: true } } },
    });
  }

  /** Active plan lookup (join-gym / clerk register / GCash payment). */
  async findActiveByIdAndGym(
    planId: string,
    gymId: string,
    tx: Tx = prisma,
  ) {
    return tx.membershipPlan.findFirst({
      where: { id: planId, gymId, isActive: true },
    });
  }

  async findPlanByIdOnly(planId: string, tx: Tx = prisma) {
    return tx.membershipPlan.findUnique({ where: { id: planId } });
  }

  async createPlanRow(data: Prisma.MembershipPlanCreateArgs["data"], tx: Tx = prisma) {
    return tx.membershipPlan.create({ data });
  }

  async updatePlanRow(
    id: string,
    data: Record<string, unknown>,
    tx: Tx = prisma,
  ) {
    return tx.membershipPlan.update({ where: { id }, data });
  }

  async deletePlansByGymIds(gymIds: string[], tx: Tx = prisma) {
    return tx.membershipPlan.deleteMany({ where: { gymId: { in: gymIds } } });
  }
}

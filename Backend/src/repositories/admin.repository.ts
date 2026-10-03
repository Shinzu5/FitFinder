import { Prisma } from "@prisma/client";
import prisma from "@/config/database";

/**
 * AdminActivity log + the admin list / detail / analytics queries
 * (admin.controller.ts). 1:1 with the Prisma queries used there.
 */
export class AdminRepository {
  // ─── AdminActivity ──────────────────────────────────────────────────────────

  async createActivity(
    args: Prisma.AdminActivityCreateArgs,
  ) {
    return prisma.adminActivity.create(args);
  }

  /** Record an admin feed entry. */
  async log(message: string, tone: "SUCCESS" | "INFO" | "WARNING" = "INFO") {
    return prisma.adminActivity.create({ data: { message, tone } });
  }

  /** Latest activity feed entries (dashboard). */
  async listRecentActivities(take = 20) {
    return prisma.adminActivity.findMany({
      orderBy: { createdAt: "desc" },
      take,
    });
  }

  async deleteActivities(
    args: Prisma.AdminActivityDeleteManyArgs,
  ) {
    return prisma.adminActivity.deleteMany(args);
  }

  // ─── Admin user list / detail ───────────────────────────────────────────────

  /** Users list with clerk-gym summary (optional role filter). */
  async listUsers(where: Prisma.UserWhereInput) {
    return prisma.user.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
        emailVerified: true,
        clerkGymId: true,
        clerkOfGym: {
          select: {
            id: true,
            name: true,
            owner: { select: { id: true, fullName: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /** Single user with clerk-gym summary (View modal). */
  async findUserDetail(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
        emailVerified: true,
        clerkGymId: true,
        clerkOfGym: {
          select: { id: true, name: true, owner: { select: { fullName: true } } },
        },
      },
    });
  }

  /** Minimal user probe (remove-user role guard). */
  async findUserByIdAndRole(id: string) {
    return prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
  }

  // ─── Admin dashboard / analytics counts ─────────────────────────────────────

  async countUsers(args: Prisma.UserCountArgs = {}) {
    return prisma.user.count(args);
  }

  async countOwners() {
    return prisma.user.count({ where: { role: "OWNER" } });
  }

  async countUsersSince(from: Date) {
    return prisma.user.count({ where: { createdAt: { gte: from } } });
  }

  async countUsersBetween(from: Date, to: Date) {
    return prisma.user.count({ where: { createdAt: { gte: from, lt: to } } });
  }

  async countUsersByRole(role: "USER" | "OWNER" | "CLERK" | "ADMIN") {
    return prisma.user.count({ where: { role } });
  }

  async countActiveGyms() {
    return prisma.gym.count({ where: { status: "ACTIVE" } });
  }

  async countActiveGymsSince(from: Date) {
    return prisma.gym.count({ where: { status: "ACTIVE", createdAt: { gte: from } } });
  }

  async countLiveMemberships() {
    return prisma.gymMembership.count({
      where: { status: { in: ["ACTIVE", "EXPIRING"] } },
    });
  }

  /** Users grouped by role (analytics usersByRole). */
  async groupUsersByRole() {
    return prisma.user.groupBy({
      by: ["role"],
      _count: { _all: true },
    });
  }

  // ─── Dashboard / gyms / list-support queries ───────────────────────────────

  /** Flip legacy PENDING gyms to ACTIVE (dashboard + admin gyms list). */
  async activatePendingGyms() {
    return prisma.gym.updateMany({
      where: { status: "PENDING" },
      data: { status: "ACTIVE" },
    });
  }

  /** All owner-plan purchases, newest purchase first. */
  async listOwnerSubscriptionsLatest() {
    return prisma.ownerSubscription.findMany({
      orderBy: { paidAt: "desc" },
      select: { ownerId: true, validUntil: true },
    });
  }

  /** Active gyms — id + owner only (plan-status fan-out). */
  async listActiveGymOwnerRefs() {
    return prisma.gym.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, ownerId: true },
    });
  }

  /** Latest purchase per owner for a set of owners (newest first). */
  async listOwnerSubscriptionsByOwners(ownerIds: string[]) {
    return prisma.ownerSubscription.findMany({
      where: { ownerId: { in: ownerIds } },
      orderBy: { paidAt: "desc" },
      select: { ownerId: true, validUntil: true },
    });
  }

  /** Full owner-plan rows for a set of owners (admin gyms plan card). */
  async listOwnerSubscriptionsFullByOwners(ownerIds: string[]) {
    return prisma.ownerSubscription.findMany({
      where: { ownerId: { in: ownerIds } },
      orderBy: { paidAt: "desc" },
    });
  }

  /** Owners with a PENDING owner-plan Xendit payment (no subscription yet). */
  async listPendingSubscriptionOwners(ownerIds: string[]) {
    return prisma.xenditPayment.findMany({
      where: { userId: { in: ownerIds }, status: "PENDING", type: "SUBSCRIPTION" },
      select: { userId: true },
      distinct: ["userId"],
    });
  }

  /** Mark overdue gym memberships expired (user list). */
  async expireOverdueMembershipsByUserIds(userIds: string[], now: Date) {
    return prisma.gymMembership.updateMany({
      where: {
        userId: { in: userIds },
        status: { in: ["ACTIVE", "EXPIRING"] },
        expiresAt: { lt: now },
      },
      data: { status: "EXPIRED" },
    });
  }

  /** Mark overdue gym memberships expired (single user detail). */
  async expireOverdueMembershipByUser(userId: string, now: Date) {
    return prisma.gymMembership.updateMany({
      where: {
        userId,
        status: { in: ["ACTIVE", "EXPIRING"] },
        expiresAt: { lt: now },
      },
      data: { status: "EXPIRED" },
    });
  }

  /** Distinct gymer ids with a live membership right now. */
  async listLiveMembershipUserIds(userIds: string[], now: Date) {
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

  /** Membership history with gym + plan names (user detail). */
  async listMembershipsForUser(userId: string) {
    return prisma.gymMembership.findMany({
      where: { userId },
      include: {
        gym: { select: { id: true, name: true } },
        plan: { select: { name: true } },
      },
      orderBy: { joinedAt: "desc" },
    });
  }

  /** Walk-in approval history with gym (user detail). */
  async listApprovalsForUser(userId: string) {
    return prisma.walkInApproval.findMany({
      where: { userId },
      include: { gym: { select: { id: true, name: true } } },
      orderBy: { submittedAt: "desc" },
    });
  }

  /** Active gyms with owner + live member count (admin gyms list). */
  async listActiveGymsWithOwnerAndMembers() {
    return prisma.gym.findMany({
      where: { status: "ACTIVE" },
      include: {
        owner: { select: { id: true, fullName: true, email: true } },
        _count: {
          select: {
            gymMemberships: {
              where: { status: { in: ["ACTIVE", "EXPIRING"] } },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /** Top-gym candidates for analytics (take 50, newest first). */
  async listTopGymCandidates() {
    return prisma.gym.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        address: true,
        coverImageUrl: true,
        _count: {
          select: {
            gymMemberships: {
              where: { status: { in: ["ACTIVE", "EXPIRING"] } },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  /** Join dates since a point in time (membership growth chart). */
  async listMembershipJoinDates(from: Date) {
    return prisma.gymMembership.findMany({
      where: { joinedAt: { gte: from } },
      select: { joinedAt: true },
    });
  }

  // ─── Permanent user purge ───────────────────────────────────────────────────

  /**
   * Permanently remove a platform user and every record tied to them —
   * one atomic round of queries (was prisma.$transaction in
   * permanently-delete-user-service).
   */
  async purgeUserRecords(userId: string) {
    return prisma.$transaction(async (tx) => {
      await runPurgeUserRecords(tx, userId);
    });
  }
}

/**
 * Shared cleanup used by single-user delete and gym cascade delete.
 * Accepts a caller-owned transaction client so it can join the surrounding
 * atomic unit opened by the caller (gym delete cascade in gym.controller).
 */
export async function runPurgeUserRecords(
  tx: Prisma.TransactionClient,
  userId: string,
): Promise<void> {
  await tx.user.update({
    where: { id: userId },
    data: {
      refreshToken: null,
      clerkGymId: null,
    },
  });

  await tx.clerkTransaction.updateMany({
    where: { clerkId: userId },
    data: { dailySalesReportId: null },
  });
  await tx.clerkTransaction.deleteMany({ where: { clerkId: userId } });
  await tx.dailySalesReport.deleteMany({ where: { clerkId: userId } });

  await tx.directConversationHide.deleteMany({ where: { userId } });
  await tx.directMessage.deleteMany({
    where: {
      OR: [{ senderId: userId }, { receiverId: userId }],
    },
  });
  await tx.message.deleteMany({ where: { senderId: userId } });
  await tx.walkInApproval.deleteMany({ where: { userId } });
  await tx.gymMembership.deleteMany({ where: { userId } });
  await tx.xenditPayment.deleteMany({ where: { userId } });

  await tx.user.delete({ where: { id: userId } });
}

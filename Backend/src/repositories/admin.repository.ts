import { Prisma } from "@prisma/client";
import prisma from "../config/database";

export type Tx = typeof prisma | Prisma.TransactionClient;

/**
 * AdminActivity log + the admin list / detail / analytics queries
 * (admin.controller.ts). 1:1 with the Prisma queries used there.
 */
export class AdminRepository {
  // ─── AdminActivity ──────────────────────────────────────────────────────────

  async createActivity(
    args: Prisma.AdminActivityCreateArgs,
    tx: Tx = prisma,
  ) {
    return tx.adminActivity.create(args);
  }

  /** Record an admin feed entry. */
  async log(message: string, tone: "SUCCESS" | "INFO" | "WARNING" = "INFO", tx: Tx = prisma) {
    return tx.adminActivity.create({ data: { message, tone } });
  }

  /** Latest activity feed entries (dashboard). */
  async listRecentActivities(take = 20, tx: Tx = prisma) {
    return tx.adminActivity.findMany({
      orderBy: { createdAt: "desc" },
      take,
    });
  }

  async deleteActivities(
    args: Prisma.AdminActivityDeleteManyArgs,
    tx: Tx = prisma,
  ) {
    return tx.adminActivity.deleteMany(args);
  }

  // ─── Admin user list / detail ───────────────────────────────────────────────

  /** Users list with clerk-gym summary (optional role filter). */
  async listUsers(where: Prisma.UserWhereInput, tx: Tx = prisma) {
    return tx.user.findMany({
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
  async findUserDetail(userId: string, tx: Tx = prisma) {
    return tx.user.findUnique({
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
  async findUserByIdAndRole(id: string, tx: Tx = prisma) {
    return tx.user.findUnique({ where: { id }, select: { id: true, role: true } });
  }

  // ─── Admin dashboard / analytics counts ─────────────────────────────────────

  async countUsers(args: Prisma.UserCountArgs = {}, tx: Tx = prisma) {
    return tx.user.count(args);
  }

  async countOwners(tx: Tx = prisma) {
    return tx.user.count({ where: { role: "OWNER" } });
  }

  async countUsersSince(from: Date, tx: Tx = prisma) {
    return tx.user.count({ where: { createdAt: { gte: from } } });
  }

  async countUsersBetween(from: Date, to: Date, tx: Tx = prisma) {
    return tx.user.count({ where: { createdAt: { gte: from, lt: to } } });
  }

  async countUsersByRole(role: "USER" | "OWNER" | "CLERK" | "ADMIN", tx: Tx = prisma) {
    return tx.user.count({ where: { role } });
  }

  async countActiveGyms(tx: Tx = prisma) {
    return tx.gym.count({ where: { status: "ACTIVE" } });
  }

  async countActiveGymsSince(from: Date, tx: Tx = prisma) {
    return tx.gym.count({ where: { status: "ACTIVE", createdAt: { gte: from } } });
  }

  async countLiveMemberships(tx: Tx = prisma) {
    return tx.gymMembership.count({
      where: { status: { in: ["ACTIVE", "EXPIRING"] } },
    });
  }

  /** Users grouped by role (analytics usersByRole). */
  async groupUsersByRole(tx: Tx = prisma) {
    return tx.user.groupBy({
      by: ["role"],
      _count: { _all: true },
    });
  }
}

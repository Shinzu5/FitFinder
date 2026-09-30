import { Prisma } from "@prisma/client";
import prisma from "../config/database";

/** Client usable for this repository: shared client or an interactive-transaction client. */
export type Tx = typeof prisma | Prisma.TransactionClient;

export class UserRepository {
  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  async create(data: {
    fullName: string;
    email: string;
    passwordHash: string;
    role?: "USER" | "OWNER" | "CLERK" | "ADMIN";
    verificationCode?: string | null;
    verificationExpires?: Date | null;
    resetToken?: string | null;
    resetExpires?: Date | null;
    resetVerified?: boolean;
    resetAttempts?: number;
    refreshToken?: string | null;
    avatarUrl?: string | null;
  }) {
    return prisma.user.create({
      data,
    });
  }

  async updateById(id: string, data: Record<string, unknown>) {
    return prisma.user.update({
      where: { id },
      data,
    });
  }

  async updateProfile(userId: string, data: Record<string, unknown>) {
    return prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        avatarUrl: true,
        emailVerified: true,
        createdAt: true,
      },
    });
  }

  async clearResetState(userId: string) {
    return this.updateById(userId, {
      resetToken: null,
      resetExpires: null,
      resetVerified: false,
      resetAttempts: 0,
    });
  }

  async setRefreshToken(userId: string, refreshToken: string | null) {
    return this.updateById(userId, { refreshToken });
  }

  async getMe(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        avatarUrl: true,
        emailVerified: true,
        createdAt: true,
      },
    });
  }

  // ─── Added methods (additive — existing signatures above untouched) ─────────

  async findMany(args: Prisma.UserFindManyArgs, tx: Tx = prisma) {
    return tx.user.findMany(args);
  }

  async findFirst(args: Prisma.UserFindFirstArgs, tx: Tx = prisma) {
    return tx.user.findFirst(args);
  }

  async findUnique(args: Prisma.UserFindUniqueArgs, tx: Tx = prisma) {
    return tx.user.findUnique(args);
  }

  async count(args: Prisma.UserCountArgs = {}, tx: Tx = prisma) {
    return tx.user.count(args);
  }

  async updateMany(args: Prisma.UserUpdateManyArgs, tx: Tx = prisma) {
    return tx.user.updateMany(args);
  }

  /** Create with full Prisma input (e.g. owner-created CLERK with clerkGymId). */
  async createUser(data: Prisma.UserCreateArgs["data"], tx: Tx = prisma) {
    return tx.user.create({ data });
  }

  /** Permanent account deletion (admin / gym-owner purge). */
  async deleteUser(args: Prisma.UserDeleteArgs, tx: Tx = prisma) {
    return tx.user.delete(args);
  }

  // ─── Clerk / gym lookups ────────────────────────────────────────────────────

  /** Role + assigned gym for a staff member (clerk/attendance gym resolution). */
  async findRoleAndClerkGymById(id: string, tx: Tx = prisma) {
    return tx.user.findUnique({
      where: { id },
      select: { role: true, clerkGymId: true },
    });
  }

  /** Clerk ids assigned to a gym (realtime staff fan-out, staff lists). */
  async findClerkIdsByGym(gymId: string, tx: Tx = prisma) {
    return tx.user.findMany({
      where: { clerkGymId: gymId, role: "CLERK" },
      select: { id: true },
    });
  }

  /** Any user ids assigned to a gym (walk-in approvals fan-out). */
  async findStaffIdsByGym(gymId: string, tx: Tx = prisma) {
    return tx.user.findMany({
      where: { clerkGymId: gymId },
      select: { id: true },
    });
  }

  /** Clerk ids assigned to any of these gyms (delete-gym kick list). */
  async findClerkIdsByGymIds(gymIds: string[], tx: Tx = prisma) {
    return tx.user.findMany({
      where: { clerkGymId: { in: gymIds }, role: "CLERK" },
      select: { id: true },
    });
  }

  /** Clerk accounts with contact info for a gym (owner staff list). */
  async findStaffByGym(gymId: string, tx: Tx = prisma) {
    return tx.user.findMany({
      where: { clerkGymId: gymId, role: "CLERK" },
      select: { id: true, fullName: true, email: true },
    });
  }

  /** Every platform admin id (admin realtime fan-out). */
  async findAdminIds(tx: Tx = prisma) {
    return tx.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  }

  /** Detach clerks from deleted gyms (and revoke their refresh tokens). */
  async detachClerksByGymIds(gymIds: string[], tx: Tx = prisma) {
    return tx.user.updateMany({
      where: { clerkGymId: { in: gymIds }, role: "CLERK" },
      data: { clerkGymId: null, refreshToken: null },
    });
  }

  // ─── Active gym (session context) ──────────────────────────────────────────

  async setActiveGym(userId: string, gymId: string | null, tx: Tx = prisma) {
    return tx.user.update({
      where: { id: userId },
      data: { activeGymId: gymId },
    });
  }

  async clearActiveGym(userId: string, tx: Tx = prisma) {
    return this.setActiveGym(userId, null, tx);
  }

  async findActiveGymId(userId: string, tx: Tx = prisma) {
    return tx.user.findUnique({
      where: { id: userId },
      select: { activeGymId: true },
    });
  }

  // ─── Shared projections ─────────────────────────────────────────────────────

  /** Inbox user summary (search + conversation participants). */
  async findSummaryById(id: string, tx: Tx = prisma) {
    return tx.user.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        avatarUrl: true,
      },
    });
  }

  /** Minimal id + role probe (DM recipient / messaging permission checks). */
  async findIdAndRoleById(id: string, tx: Tx = prisma) {
    return tx.user.findUnique({ where: { id }, select: { id: true, role: true } });
  }

  /** Name + email for approval / membership payloads. */
  async findContactById(id: string, tx: Tx = prisma) {
    return tx.user.findUnique({
      where: { id },
      select: { fullName: true, email: true },
    });
  }
}

import { Prisma } from "@prisma/client";
import prisma, { withDbRetry } from "@/config/database";
import { runPurgeUserRecords } from "@/repositories/admin.repository";

/**
 * Gym CRUD + owner / clerk / activeGym lookups.
 * Every method is a 1:1 passthrough of a Prisma query used by controllers/services.
 */
export class GymRepository {
  // ─── Generic passthroughs ───────────────────────────────────────────────────

  async findMany(args: Prisma.GymFindManyArgs) {
    return prisma.gym.findMany(args);
  }

  async findFirst(args: Prisma.GymFindFirstArgs) {
    return prisma.gym.findFirst(args);
  }

  async findUnique(args: Prisma.GymFindUniqueArgs) {
    return prisma.gym.findUnique(args);
  }

  async count(args: Prisma.GymCountArgs = {}) {
    return prisma.gym.count(args);
  }

  async create(args: Prisma.GymCreateArgs) {
    return prisma.gym.create(args);
  }

  async update(args: Prisma.GymUpdateArgs) {
    return prisma.gym.update(args);
  }

  async updateMany(args: Prisma.GymUpdateManyArgs) {
    return prisma.gym.updateMany(args);
  }

  async deleteMany(args: Prisma.GymDeleteManyArgs) {
    return prisma.gym.deleteMany(args);
  }

  // ─── Named lookups (1:1 with current call sites) ────────────────────────────

  /** Auto-publish legacy PENDING gyms (admin approval removed). */
  async publishPendingGyms() {
    return prisma.gym.updateMany({
      where: { status: "PENDING" },
      data: { status: "ACTIVE" },
    });
  }

  /** Public catalog list: membership count, cheapest active plan, owner contact. */
  async listPublicCatalog(where: Prisma.GymWhereInput) {
    return prisma.gym.findMany({
      where,
      include: {
        _count: { select: { gymMemberships: true } },
        membershipPlans: { where: { isActive: true }, take: 1, orderBy: { price: "asc" } },
        owner: { select: { fullName: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findById(id: string) {
    return prisma.gym.findUnique({ where: { id } });
  }

  /** Public gym detail (owner + active plans + coaches + equipment + shop + counts). */
  async findByIdWithPublicDetail(id: string) {
    return prisma.gym.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
        membershipPlans: { where: { isActive: true }, orderBy: { price: "asc" } },
        coaches: { where: { isActive: true }, orderBy: { createdAt: "asc" } },
        equipment: true,
        shopProducts: true,
        _count: { select: { gymMemberships: true } },
      },
    });
  }

  /** Join-gym payload: first clerk + cheapest active plan. */
  async findByIdWithJoinInfo(id: string) {
    return prisma.gym.findUnique({
      where: { id },
      include: {
        clerks: { select: { id: true }, take: 1 },
        membershipPlans: {
          where: { isActive: true },
          orderBy: { price: "asc" },
          take: 1,
        },
      },
    });
  }

  /** Owner's gym (newest first) — getOwnerGym / my-gym. */
  async findLatestByOwner(ownerId: string) {
    return prisma.gym.findFirst({
      where: { ownerId },
      orderBy: { createdAt: "desc" },
    });
  }

  /** Tiny ownership-check payload (my-gym ?light=1). */
  async findLatestLightByOwner(ownerId: string) {
    return prisma.gym.findFirst({
      where: { ownerId },
      select: { id: true, name: true, status: true },
      orderBy: { createdAt: "desc" },
    });
  }

  /** Full my-gym payload with _count + membership plans. */
  async findLatestWithCountsByOwner(ownerId: string) {
    return prisma.gym.findFirst({
      where: { ownerId },
      include: {
        _count: {
          select: { gymMemberships: true, coaches: true, equipment: true },
        },
        membershipPlans: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /** Newest gym id for an owner (subscription → gym linking). */
  async findLatestIdByOwner(ownerId: string) {
    return prisma.gym.findFirst({
      where: { ownerId },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
  }

  /** Newest ACTIVE gym name for an owner (DM thread header). */
  async findLatestActiveNameByOwner(ownerId: string) {
    return prisma.gym.findFirst({
      where: { ownerId, status: "ACTIVE" },
      select: { name: true },
      orderBy: { createdAt: "desc" },
    });
  }

  /** Every gym id owned by this owner (admin delete scope). */
  async findIdsByOwner(ownerId: string) {
    return prisma.gym.findMany({ where: { ownerId }, select: { id: true } });
  }

  /** ACTIVE gyms with ownerId (admin dashboard). */
  async findActiveIdAndOwner() {
    return prisma.gym.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, ownerId: true },
    });
  }

  /** Admin gyms list: ACTIVE + owner + live-member counts. */
  async findActiveWithOwnerAndCounts() {
    return prisma.gym.findMany({
      where: { status: "ACTIVE" },
      include: {
        owner: { select: { id: true, fullName: true, email: true } },
        _count: {
          select: {
            gymMemberships: { where: { status: { in: ["ACTIVE", "EXPIRING"] } } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /** Admin analytics top-gym candidates (latest 50 ACTIVE gyms). */
  async findActiveForAnalytics() {
    return prisma.gym.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        address: true,
        coverImageUrl: true,
        _count: {
          select: {
            gymMemberships: { where: { status: { in: ["ACTIVE", "EXPIRING"] } } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  /** ACTIVE gyms owned by these owners (DM conversation gym names). */
  async findActiveByOwnerIds(ownerIds: string[]) {
    return prisma.gym.findMany({
      where: { ownerId: { in: ownerIds }, status: "ACTIVE" },
      select: { ownerId: true, name: true },
      orderBy: { createdAt: "desc" },
    });
  }

  /** Owner id for realtime fan-out. */
  async findOwnerId(id: string) {
    return prisma.gym.findUnique({ where: { id }, select: { ownerId: true } });
  }

  async createGym(data: Prisma.GymCreateArgs["data"]) {
    return prisma.gym.create({ data });
  }

  async updateGym(id: string, data: Record<string, unknown>) {
    return prisma.gym.update({ where: { id }, data });
  }

  async deleteManyByIds(gymIds: string[]) {
    return prisma.gym.deleteMany({ where: { id: { in: gymIds } } });
  }

  async countByOwner(ownerId: string) {
    return prisma.gym.count({ where: { ownerId } });
  }

  // ─── my-gym (resilient) ─────────────────────────────────────────────────────

  /** Tiny ownership-check payload with one reconnect retry (my-gym ?light=1). */
  async findLatestLightByOwnerWithRetry(ownerId: string) {
    return withDbRetry(() => this.findLatestLightByOwner(ownerId));
  }

  /** Full my-gym payload with one reconnect retry (transient Neon pool drops). */
  async findLatestWithCountsByOwnerWithRetry(ownerId: string) {
    return withDbRetry(() => this.findLatestWithCountsByOwner(ownerId));
  }

  // ─── Delete cascade ─────────────────────────────────────────────────────────

  /**
   * Delete gyms and everything hanging off them in ONE atomic unit
   * (was prisma.$transaction in gym.controller deleteGym): detach + purge the
   * clerks, drop gym-scoped rows, delete the gyms and — when the owner has no
   * gyms left — expire their plan access and demote them back to USER.
   * Returns whether the owner must repurchase a plan.
   */
  async deleteGymCascade(args: {
    gymIds: string[];
    ownerId: string;
    /** Clerk ids resolved before the transaction (kicked sessions). */
    clerkIds: string[];
  }): Promise<{ mustRepurchase: boolean }> {
    const { gymIds, ownerId, clerkIds } = args;

    return prisma.$transaction(async (tx) => {
      // Detach then permanently remove clerks (no orphan CLERK accounts)
      await tx.user.updateMany({
        where: { clerkGymId: { in: gymIds }, role: "CLERK" },
        data: { clerkGymId: null, refreshToken: null },
      });

      for (const clerkId of clerkIds) {
        const stillThere = await tx.user.findUnique({
          where: { id: clerkId },
          select: { id: true },
        });
        if (stillThere) {
          await runPurgeUserRecords(tx, clerkId);
        }
      }

      // Explicit gym-scoped cleanup (cascade also covers children)
      await tx.walkInApproval.deleteMany({ where: { gymId: { in: gymIds } } });
      await tx.gymMembership.deleteMany({ where: { gymId: { in: gymIds } } });
      await tx.clerkTransaction.deleteMany({ where: { gymId: { in: gymIds } } });
      await tx.dailySalesReport.deleteMany({ where: { gymId: { in: gymIds } } });
      await tx.message.deleteMany({
        where: { conversation: { gymId: { in: gymIds } } },
      });
      await tx.conversation.deleteMany({ where: { gymId: { in: gymIds } } });
      await tx.membershipPlan.deleteMany({ where: { gymId: { in: gymIds } } });
      await tx.coach.deleteMany({ where: { gymId: { in: gymIds } } });
      await tx.equipment.deleteMany({ where: { gymId: { in: gymIds } } });
      await tx.exercise.deleteMany({ where: { gymId: { in: gymIds } } });
      await tx.shopProduct.deleteMany({ where: { gymId: { in: gymIds } } });

      await tx.gym.deleteMany({ where: { id: { in: gymIds } } });

      const remaining = await tx.gym.count({ where: { ownerId } });
      if (remaining === 0) {
        // Expire plan access (keep rows for revenue history) + demote to USER
        await tx.ownerSubscription.updateMany({
          where: { ownerId },
          data: { gymId: null, validUntil: new Date() },
        });
        await tx.user.update({
          where: { id: ownerId },
          data: { role: "USER" },
        });
        return { mustRepurchase: true };
      }

      return { mustRepurchase: false };
    });
  }
}

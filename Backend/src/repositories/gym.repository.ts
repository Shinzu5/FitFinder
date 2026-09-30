import { Prisma } from "@prisma/client";
import prisma from "../config/database";

/** Client usable for this repository: shared client or an interactive-transaction client. */
export type Tx = typeof prisma | Prisma.TransactionClient;

/**
 * Gym CRUD + owner / clerk / activeGym lookups.
 * Every method is a 1:1 passthrough of a Prisma query used by controllers/services.
 */
export class GymRepository {
  // ─── Generic passthroughs ───────────────────────────────────────────────────

  async findMany(args: Prisma.GymFindManyArgs, tx: Tx = prisma) {
    return tx.gym.findMany(args);
  }

  async findFirst(args: Prisma.GymFindFirstArgs, tx: Tx = prisma) {
    return tx.gym.findFirst(args);
  }

  async findUnique(args: Prisma.GymFindUniqueArgs, tx: Tx = prisma) {
    return tx.gym.findUnique(args);
  }

  async count(args: Prisma.GymCountArgs = {}, tx: Tx = prisma) {
    return tx.gym.count(args);
  }

  async create(args: Prisma.GymCreateArgs, tx: Tx = prisma) {
    return tx.gym.create(args);
  }

  async update(args: Prisma.GymUpdateArgs, tx: Tx = prisma) {
    return tx.gym.update(args);
  }

  async updateMany(args: Prisma.GymUpdateManyArgs, tx: Tx = prisma) {
    return tx.gym.updateMany(args);
  }

  async deleteMany(args: Prisma.GymDeleteManyArgs, tx: Tx = prisma) {
    return tx.gym.deleteMany(args);
  }

  // ─── Named lookups (1:1 with current call sites) ────────────────────────────

  /** Auto-publish legacy PENDING gyms (admin approval removed). */
  async publishPendingGyms(tx: Tx = prisma) {
    return tx.gym.updateMany({
      where: { status: "PENDING" },
      data: { status: "ACTIVE" },
    });
  }

  async findById(id: string, tx: Tx = prisma) {
    return tx.gym.findUnique({ where: { id } });
  }

  /** Public gym detail (owner + active plans + coaches + equipment + shop + counts). */
  async findByIdWithPublicDetail(id: string, tx: Tx = prisma) {
    return tx.gym.findUnique({
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
  async findByIdWithJoinInfo(id: string, tx: Tx = prisma) {
    return tx.gym.findUnique({
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
  async findLatestByOwner(ownerId: string, tx: Tx = prisma) {
    return tx.gym.findFirst({
      where: { ownerId },
      orderBy: { createdAt: "desc" },
    });
  }

  /** Tiny ownership-check payload (my-gym ?light=1). */
  async findLatestLightByOwner(ownerId: string, tx: Tx = prisma) {
    return tx.gym.findFirst({
      where: { ownerId },
      select: { id: true, name: true, status: true },
      orderBy: { createdAt: "desc" },
    });
  }

  /** Full my-gym payload with _count + membership plans. */
  async findLatestWithCountsByOwner(ownerId: string, tx: Tx = prisma) {
    return tx.gym.findFirst({
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
  async findLatestIdByOwner(ownerId: string, tx: Tx = prisma) {
    return tx.gym.findFirst({
      where: { ownerId },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
  }

  /** Newest ACTIVE gym name for an owner (DM thread header). */
  async findLatestActiveNameByOwner(ownerId: string, tx: Tx = prisma) {
    return tx.gym.findFirst({
      where: { ownerId, status: "ACTIVE" },
      select: { name: true },
      orderBy: { createdAt: "desc" },
    });
  }

  /** Every gym id owned by this owner (admin delete scope). */
  async findIdsByOwner(ownerId: string, tx: Tx = prisma) {
    return tx.gym.findMany({ where: { ownerId }, select: { id: true } });
  }

  /** ACTIVE gyms with ownerId (admin dashboard). */
  async findActiveIdAndOwner(tx: Tx = prisma) {
    return tx.gym.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, ownerId: true },
    });
  }

  /** Admin gyms list: ACTIVE + owner + live-member counts. */
  async findActiveWithOwnerAndCounts(tx: Tx = prisma) {
    return tx.gym.findMany({
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
  async findActiveForAnalytics(tx: Tx = prisma) {
    return tx.gym.findMany({
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
  async findActiveByOwnerIds(ownerIds: string[], tx: Tx = prisma) {
    return tx.gym.findMany({
      where: { ownerId: { in: ownerIds }, status: "ACTIVE" },
      select: { ownerId: true, name: true },
      orderBy: { createdAt: "desc" },
    });
  }

  /** Owner id for realtime fan-out. */
  async findOwnerId(id: string, tx: Tx = prisma) {
    return tx.gym.findUnique({ where: { id }, select: { ownerId: true } });
  }

  async createGym(data: Prisma.GymCreateArgs["data"], tx: Tx = prisma) {
    return tx.gym.create({ data });
  }

  async updateGym(id: string, data: Record<string, unknown>, tx: Tx = prisma) {
    return tx.gym.update({ where: { id }, data });
  }

  async deleteManyByIds(gymIds: string[], tx: Tx = prisma) {
    return tx.gym.deleteMany({ where: { id: { in: gymIds } } });
  }

  async countByOwner(ownerId: string, tx: Tx = prisma) {
    return tx.gym.count({ where: { ownerId } });
  }
}

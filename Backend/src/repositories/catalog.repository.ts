import { Prisma } from "@prisma/client";
import prisma from "../config/database";

export type Tx = typeof prisma | Prisma.TransactionClient;

/**
 * Catalog CRUD for Coach, Equipment, Exercise and ShopProduct.
 * 1:1 with the owner/gym/user/realtime/payment queries.
 */
export class CatalogRepository {
  // ─── Coach ──────────────────────────────────────────────────────────────────

  async findCoaches(args: Prisma.CoachFindManyArgs, tx: Tx = prisma) {
    return tx.coach.findMany(args);
  }

  async findCoach(args: Prisma.CoachFindFirstArgs, tx: Tx = prisma) {
    return tx.coach.findFirst(args);
  }

  async createCoach(args: Prisma.CoachCreateArgs, tx: Tx = prisma) {
    return tx.coach.create(args);
  }

  async updateCoach(args: Prisma.CoachUpdateArgs, tx: Tx = prisma) {
    return tx.coach.update(args);
  }

  async deleteCoach(args: Prisma.CoachDeleteArgs, tx: Tx = prisma) {
    return tx.coach.delete(args);
  }

  async deleteCoaches(args: Prisma.CoachDeleteManyArgs, tx: Tx = prisma) {
    return tx.coach.deleteMany(args);
  }

  /** Coaches for a gym (owner list + realtime broadcast). */
  async listByGym(gymId: string, tx: Tx = prisma) {
    return tx.coach.findMany({
      where: { gymId },
      orderBy: { createdAt: "asc" },
    });
  }

  /** Coach scoped to a gym (owner update / remove). */
  async findByIdAndGym(id: string, gymId: string, tx: Tx = prisma) {
    return tx.coach.findFirst({ where: { id, gymId } });
  }

  /** Bookable coach lookup (join-gym, GCash payment, activation). */
  async findActiveByIdAndGym(id: string, gymId: string, tx: Tx = prisma) {
    return tx.coach.findFirst({
      where: { id, gymId, isActive: true },
      select: { id: true },
    });
  }

  /** Bookable coach lookup returning the full row (session price/name). */
  async findActiveCoachByIdAndGym(id: string, gymId: string, tx: Tx = prisma) {
    return tx.coach.findFirst({ where: { id, gymId, isActive: true } });
  }

  async deleteCoachById(id: string, tx: Tx = prisma) {
    return tx.coach.delete({ where: { id } });
  }

  // ─── Equipment ──────────────────────────────────────────────────────────────

  async findEquipment(args: Prisma.EquipmentFindManyArgs, tx: Tx = prisma) {
    return tx.equipment.findMany(args);
  }

  async findEquipmentItem(args: Prisma.EquipmentFindFirstArgs, tx: Tx = prisma) {
    return tx.equipment.findFirst(args);
  }

  async createEquipment(args: Prisma.EquipmentCreateArgs, tx: Tx = prisma) {
    return tx.equipment.create(args);
  }

  async updateEquipment(args: Prisma.EquipmentUpdateArgs, tx: Tx = prisma) {
    return tx.equipment.update(args);
  }

  async deleteEquipment(args: Prisma.EquipmentDeleteArgs, tx: Tx = prisma) {
    return tx.equipment.delete(args);
  }

  async deleteEquipmentMany(args: Prisma.EquipmentDeleteManyArgs, tx: Tx = prisma) {
    return tx.equipment.deleteMany(args);
  }

  /** Equipment for a gym (owner list). */
  async listEquipmentByGym(gymId: string, tx: Tx = prisma) {
    return tx.equipment.findMany({ where: { gymId } });
  }

  /** Equipment for a gym sorted by name (gymer page + realtime). */
  async listEquipmentByGymOrdered(gymId: string, tx: Tx = prisma) {
    return tx.equipment.findMany({ where: { gymId }, orderBy: { name: "asc" } });
  }

  async findEquipmentByIdAndGym(id: string, gymId: string, tx: Tx = prisma) {
    return tx.equipment.findFirst({ where: { id, gymId } });
  }

  async deleteEquipmentById(id: string, tx: Tx = prisma) {
    return tx.equipment.delete({ where: { id } });
  }

  // ─── Exercise ───────────────────────────────────────────────────────────────

  async findExercises(args: Prisma.ExerciseFindManyArgs, tx: Tx = prisma) {
    return tx.exercise.findMany(args);
  }

  async findExercise(args: Prisma.ExerciseFindFirstArgs, tx: Tx = prisma) {
    return tx.exercise.findFirst(args);
  }

  async createExercise(args: Prisma.ExerciseCreateArgs, tx: Tx = prisma) {
    return tx.exercise.create(args);
  }

  async updateExercise(args: Prisma.ExerciseUpdateArgs, tx: Tx = prisma) {
    return tx.exercise.update(args);
  }

  async deleteExercise(args: Prisma.ExerciseDeleteArgs, tx: Tx = prisma) {
    return tx.exercise.delete(args);
  }

  async deleteExercises(args: Prisma.ExerciseDeleteManyArgs, tx: Tx = prisma) {
    return tx.exercise.deleteMany(args);
  }

  /** Exercises for a gym (owner list). */
  async listByGymUnordered(gymId: string, tx: Tx = prisma) {
    return tx.exercise.findMany({ where: { gymId } });
  }

  /** Member-only exercises for a gym (newest first). */
  async listByGymRecent(gymId: string, tx: Tx = prisma) {
    return tx.exercise.findMany({ where: { gymId }, orderBy: { createdAt: "desc" } });
  }

  async findExerciseByIdAndGym(id: string, gymId: string, tx: Tx = prisma) {
    return tx.exercise.findFirst({ where: { id, gymId } });
  }

  async deleteExerciseById(id: string, tx: Tx = prisma) {
    return tx.exercise.delete({ where: { id } });
  }

  // ─── ShopProduct ────────────────────────────────────────────────────────────

  async findShopProducts(args: Prisma.ShopProductFindManyArgs, tx: Tx = prisma) {
    return tx.shopProduct.findMany(args);
  }

  async findShopProduct(args: Prisma.ShopProductFindFirstArgs, tx: Tx = prisma) {
    return tx.shopProduct.findFirst(args);
  }

  async createShopProduct(args: Prisma.ShopProductCreateArgs, tx: Tx = prisma) {
    return tx.shopProduct.create(args);
  }

  async updateShopProduct(args: Prisma.ShopProductUpdateArgs, tx: Tx = prisma) {
    return tx.shopProduct.update(args);
  }

  async deleteShopProduct(args: Prisma.ShopProductDeleteArgs, tx: Tx = prisma) {
    return tx.shopProduct.delete(args);
  }

  async deleteShopProducts(
    args: Prisma.ShopProductDeleteManyArgs,
    tx: Tx = prisma,
  ) {
    return tx.shopProduct.deleteMany(args);
  }

  /** Products for a gym, newest first (owner + gymer + realtime). */
  async listShopByGym(gymId: string, tx: Tx = prisma) {
    return tx.shopProduct.findMany({
      where: { gymId },
      orderBy: { createdAt: "desc" },
    });
  }

  async findShopByIdAndGym(id: string, gymId: string, tx: Tx = prisma) {
    return tx.shopProduct.findFirst({ where: { id, gymId } });
  }

  async deleteShopById(id: string, tx: Tx = prisma) {
    return tx.shopProduct.delete({ where: { id } });
  }
}

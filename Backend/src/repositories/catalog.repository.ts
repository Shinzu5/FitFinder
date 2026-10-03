import { Prisma } from "@prisma/client";
import prisma from "@/config/database";

/**
 * Catalog CRUD for Coach, Equipment, Exercise and ShopProduct.
 * 1:1 with the owner/gym/user/realtime/payment queries.
 */
export class CatalogRepository {
  // ─── Coach ──────────────────────────────────────────────────────────────────

  async findCoaches(args: Prisma.CoachFindManyArgs) {
    return prisma.coach.findMany(args);
  }

  async findCoach(args: Prisma.CoachFindFirstArgs) {
    return prisma.coach.findFirst(args);
  }

  async createCoach(args: Prisma.CoachCreateArgs) {
    return prisma.coach.create(args);
  }

  async updateCoach(args: Prisma.CoachUpdateArgs) {
    return prisma.coach.update(args);
  }

  async deleteCoach(args: Prisma.CoachDeleteArgs) {
    return prisma.coach.delete(args);
  }

  async deleteCoaches(args: Prisma.CoachDeleteManyArgs) {
    return prisma.coach.deleteMany(args);
  }

  /** Coaches for a gym (owner list + realtime broadcast). */
  async listByGym(gymId: string) {
    return prisma.coach.findMany({
      where: { gymId },
      orderBy: { createdAt: "asc" },
    });
  }

  /** Coach scoped to a gym (owner update / remove). */
  async findByIdAndGym(id: string, gymId: string) {
    return prisma.coach.findFirst({ where: { id, gymId } });
  }

  /** Bookable coach lookup (join-gym, GCash payment, activation). */
  async findActiveByIdAndGym(id: string, gymId: string) {
    return prisma.coach.findFirst({
      where: { id, gymId, isActive: true },
      select: { id: true },
    });
  }

  /** Bookable coach lookup returning the full row (session price/name). */
  async findActiveCoachByIdAndGym(id: string, gymId: string) {
    return prisma.coach.findFirst({ where: { id, gymId, isActive: true } });
  }

  async deleteCoachById(id: string) {
    return prisma.coach.delete({ where: { id } });
  }

  // ─── Equipment ──────────────────────────────────────────────────────────────

  async findEquipment(args: Prisma.EquipmentFindManyArgs) {
    return prisma.equipment.findMany(args);
  }

  async findEquipmentItem(args: Prisma.EquipmentFindFirstArgs) {
    return prisma.equipment.findFirst(args);
  }

  async createEquipment(args: Prisma.EquipmentCreateArgs) {
    return prisma.equipment.create(args);
  }

  async updateEquipment(args: Prisma.EquipmentUpdateArgs) {
    return prisma.equipment.update(args);
  }

  async deleteEquipment(args: Prisma.EquipmentDeleteArgs) {
    return prisma.equipment.delete(args);
  }

  async deleteEquipmentMany(args: Prisma.EquipmentDeleteManyArgs) {
    return prisma.equipment.deleteMany(args);
  }

  /** Equipment for a gym (owner list). */
  async listEquipmentByGym(gymId: string) {
    return prisma.equipment.findMany({ where: { gymId } });
  }

  /** Equipment for a gym sorted by name (gymer page + realtime). */
  async listEquipmentByGymOrdered(gymId: string) {
    return prisma.equipment.findMany({ where: { gymId }, orderBy: { name: "asc" } });
  }

  async findEquipmentByIdAndGym(id: string, gymId: string) {
    return prisma.equipment.findFirst({ where: { id, gymId } });
  }

  async deleteEquipmentById(id: string) {
    return prisma.equipment.delete({ where: { id } });
  }

  // ─── Exercise ───────────────────────────────────────────────────────────────

  async findExercises(args: Prisma.ExerciseFindManyArgs) {
    return prisma.exercise.findMany(args);
  }

  async findExercise(args: Prisma.ExerciseFindFirstArgs) {
    return prisma.exercise.findFirst(args);
  }

  async createExercise(args: Prisma.ExerciseCreateArgs) {
    return prisma.exercise.create(args);
  }

  async updateExercise(args: Prisma.ExerciseUpdateArgs) {
    return prisma.exercise.update(args);
  }

  async deleteExercise(args: Prisma.ExerciseDeleteArgs) {
    return prisma.exercise.delete(args);
  }

  async deleteExercises(args: Prisma.ExerciseDeleteManyArgs) {
    return prisma.exercise.deleteMany(args);
  }

  /** Exercises for a gym (owner list). */
  async listByGymUnordered(gymId: string) {
    return prisma.exercise.findMany({ where: { gymId } });
  }

  /** Member-only exercises for a gym (newest first). */
  async listByGymRecent(gymId: string) {
    return prisma.exercise.findMany({ where: { gymId }, orderBy: { createdAt: "desc" } });
  }

  async findExerciseByIdAndGym(id: string, gymId: string) {
    return prisma.exercise.findFirst({ where: { id, gymId } });
  }

  async deleteExerciseById(id: string) {
    return prisma.exercise.delete({ where: { id } });
  }

  // ─── ShopProduct ────────────────────────────────────────────────────────────

  async findShopProducts(args: Prisma.ShopProductFindManyArgs) {
    return prisma.shopProduct.findMany(args);
  }

  async findShopProduct(args: Prisma.ShopProductFindFirstArgs) {
    return prisma.shopProduct.findFirst(args);
  }

  async createShopProduct(args: Prisma.ShopProductCreateArgs) {
    return prisma.shopProduct.create(args);
  }

  async updateShopProduct(args: Prisma.ShopProductUpdateArgs) {
    return prisma.shopProduct.update(args);
  }

  async deleteShopProduct(args: Prisma.ShopProductDeleteArgs) {
    return prisma.shopProduct.delete(args);
  }

  async deleteShopProducts(
    args: Prisma.ShopProductDeleteManyArgs,
  ) {
    return prisma.shopProduct.deleteMany(args);
  }

  /** Products for a gym, newest first (owner + gymer + realtime). */
  async listShopByGym(gymId: string) {
    return prisma.shopProduct.findMany({
      where: { gymId },
      orderBy: { createdAt: "desc" },
    });
  }

  async findShopByIdAndGym(id: string, gymId: string) {
    return prisma.shopProduct.findFirst({ where: { id, gymId } });
  }

  async deleteShopById(id: string) {
    return prisma.shopProduct.delete({ where: { id } });
  }
}

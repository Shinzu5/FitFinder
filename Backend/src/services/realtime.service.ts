import prisma from "../config/database";
import { emitToGym, emitToRoom, emitToUser } from "../socket";

export function emitToUserSafe(userId: string, event: string, payload: unknown): void {
  emitToUser(userId, event, payload);
}

/**
 * Broadcast coaches for this gym.
 * - Gym room (Gymers): ACTIVE only — inactive/deleted disappear from booking UI.
 * - Owner: full list (active + inactive) for Coaches management.
 */
export async function emitCoachesUpdated(gymId: string): Promise<void> {
  const [coaches, gym] = await Promise.all([
    prisma.coach.findMany({
      where: { gymId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.gym.findUnique({ where: { id: gymId }, select: { ownerId: true } }),
  ]);

  const activeCoaches = coaches.filter((c) => c.isActive);
  emitToGym(gymId, "coaches_updated", { gymId, coaches: activeCoaches });

  if (gym?.ownerId) {
    emitToUser(gym.ownerId, "coaches_updated", {
      gymId,
      coaches,
      scope: "owner",
    });
  }
}

/** Broadcast equipment list to gym room (Owner CRUD → Gymer Equipment page). */
export async function emitEquipmentUpdated(gymId: string): Promise<void> {
  const equipment = await prisma.equipment.findMany({
    where: { gymId },
    orderBy: { name: "asc" },
  });
  emitToGym(gymId, "equipment_updated", { gymId, equipment });
}

/** Broadcast shop products to gym room (Owner CRUD → Gymer Shop page). */
export async function emitShopUpdated(gymId: string): Promise<void> {
  const products = await prisma.shopProduct.findMany({
    where: { gymId },
    orderBy: { createdAt: "desc" },
  });
  emitToGym(gymId, "shop_updated", { gymId, products });
}

/** Push walk-in approval status to the gymer (Proceed → Waiting → Done). */
export function emitWalkInStatus(userId: string, approval: unknown): void {
  emitToUser(userId, "walk_in_status", { approval });
}

/** Notify gym owner + assigned clerks that the approvals list changed. */
export async function emitWalkInApprovalsUpdated(gymId: string): Promise<void> {
  const [gym, clerks] = await Promise.all([
    prisma.gym.findUnique({ where: { id: gymId }, select: { ownerId: true } }),
    prisma.user.findMany({ where: { clerkGymId: gymId }, select: { id: true } }),
  ]);

  const payload = { gymId };
  if (gym?.ownerId) {
    emitToUser(gym.ownerId, "walk_in_approvals_updated", payload);
  }
  for (const clerk of clerks) {
    emitToUser(clerk.id, "walk_in_approvals_updated", payload);
  }
}

/** Tell the gymer their membership (and assigned coach) is ready. */
export function emitMembershipUpdated(userId: string): void {
  emitToUser(userId, "membership_updated", {});
}

/** Notify gym Owner + Clerks that the shared Members list changed. */
export async function emitMembersUpdated(gymId: string): Promise<void> {
  const [gym, clerks] = await Promise.all([
    prisma.gym.findUnique({ where: { id: gymId }, select: { ownerId: true } }),
    prisma.user.findMany({
      where: { clerkGymId: gymId, role: "CLERK" },
      select: { id: true },
    }),
  ]);

  const payload = { gymId };
  if (gym?.ownerId) {
    emitToUser(gym.ownerId, "members_updated", payload);
  }
  for (const clerk of clerks) {
    emitToUser(clerk.id, "members_updated", payload);
  }
}

/** Notify Owner + Clerks + gym room that attendance / Active Now changed. */
export async function emitAttendanceUpdated(
  gymId: string,
  payload: { activeNow?: number } = {},
): Promise<void> {
  const [gym, clerks] = await Promise.all([
    prisma.gym.findUnique({ where: { id: gymId }, select: { ownerId: true } }),
    prisma.user.findMany({
      where: { clerkGymId: gymId, role: "CLERK" },
      select: { id: true },
    }),
  ]);

  const body = { gymId, ...payload };
  if (gym?.ownerId) {
    emitToUser(gym.ownerId, "attendance_updated", body);
  }
  for (const clerk of clerks) {
    emitToUser(clerk.id, "attendance_updated", body);
  }
  // Gymers on home / gym rooms hear Active Now changes
  emitToGym(gymId, "attendance_updated", body);
}

/** Notify Owner + Clerks that sales / revenue / reports changed. */
export async function emitSalesUpdated(gymId: string): Promise<void> {
  const [gym, clerks] = await Promise.all([
    prisma.gym.findUnique({ where: { id: gymId }, select: { ownerId: true } }),
    prisma.user.findMany({
      where: { clerkGymId: gymId, role: "CLERK" },
      select: { id: true },
    }),
  ]);

  const payload = { gymId };
  if (gym?.ownerId) {
    emitToUser(gym.ownerId, "sales_updated", payload);
  }
  for (const clerk of clerks) {
    emitToUser(clerk.id, "sales_updated", payload);
  }
}

async function emitToAllAdmins(event: string, payload: unknown = {}): Promise<void> {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });
  for (const admin of admins) {
    emitToUser(admin.id, event, payload);
  }
}

/** Notify all platform admins that Active Gyms / plan data changed. */
export async function emitAdminGymsUpdated(): Promise<void> {
  await emitToAllAdmins("admin_gyms_updated");
}

/** Notify all platform admins that the Users list changed (register / verify / remove / role). */
export async function emitAdminUsersUpdated(): Promise<void> {
  await emitToAllAdmins("admin_users_updated");
}

/** Force-logout a user whose account was deleted (Admin or Gym Owner). */
export function emitAccountDeleted(
  userId: string,
  message = "Your account has been removed. Please sign in again.",
): void {
  emitToUser(userId, "account_deleted", { message });
}

/** Push latest membership plans from Neon to every clerk assigned to this gym. */
export async function emitMembershipPlansUpdated(gymId: string): Promise<void> {
  const [plans, clerks, gym] = await Promise.all([
    prisma.membershipPlan.findMany({
      where: { gymId, isActive: true },
      orderBy: { price: "asc" },
    }),
    prisma.user.findMany({
      where: { clerkGymId: gymId, role: "CLERK" },
      select: { id: true },
    }),
    prisma.gym.findUnique({
      where: { id: gymId },
      select: { ownerId: true },
    }),
  ]);

  const payload = {
    gymId,
    plans: plans.map((plan) => ({
      id: plan.id,
      label: plan.name,
      price: plan.price,
      durationDays: plan.durationDays,
    })),
    hasActivePlans: plans.length > 0,
    /** Lowest active plan price for home gym cards — never base membership price */
    startingPrice: plans[0]?.price ?? null,
  };

  for (const clerk of clerks) {
    emitToUser(clerk.id, "membership_plans_updated", payload);
  }
  if (gym?.ownerId) {
    emitToUser(gym.ownerId, "membership_plans_updated", payload);
  }
  // Purchase / gym profile pages join gym:{id} — hide deleted plans live
  emitToGym(gymId, "membership_plans_updated", payload);
  // Home gym list (all connected clients join gym_catalog on connect)
  emitToRoom("gym_catalog", "gym_plans_catalog_updated", payload);
}

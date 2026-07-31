import prisma from "../config/database";
import { emitToGym, emitToUser } from "../socket";

/** Broadcast full coach list to everyone viewing this gym (join flow, profile). */
export async function emitCoachesUpdated(gymId: string): Promise<void> {
  const coaches = await prisma.coach.findMany({ where: { gymId } });
  emitToGym(gymId, "coaches_updated", { gymId, coaches });
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

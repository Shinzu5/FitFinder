import { GymRepository } from "@/repositories/gym.repository";
import { MembershipRepository } from "@/repositories/membership.repository";
import { UserRepository } from "@/repositories/user.repository";
import { KickUserSessionService as kickUserSession } from "@/services/admin";
import { CreateNotificationService as createNotification } from "@/services/notification/create-notification-service";
import {
  EmitAdminGymsUpdatedService as emitAdminGymsUpdated,
  EmitAdminUsersUpdatedService as emitAdminUsersUpdated,
  EmitMembershipUpdatedService as emitMembershipUpdated,
} from "@/services/realtime";
import { emitToUser } from "@/socket";

const gymRepository = new GymRepository();
const membershipRepository = new MembershipRepository();
const userRepository = new UserRepository();

type DeleteGymResult =
  | { kind: "not-found" }
  | { kind: "forbidden" }
  | { kind: "ok"; mustRepurchase: boolean; removedClerks: number };

/**
 * DELETE /api/gyms/:id — kick staff/member sessions, then purge the gyms
 * (admin delete covers every gym the owner has).
 */
export async function DeleteGymService(opts: {
  gymId: string;
  actorId: string;
  actorRole?: string;
}): Promise<DeleteGymResult> {
  const gym = await gymRepository.findById(opts.gymId);

  if (!gym) {
    return { kind: "not-found" };
  }

  if (gym.ownerId !== opts.actorId && opts.actorRole !== "ADMIN") {
    return { kind: "forbidden" };
  }

  const ownerId = gym.ownerId;
  const isAdminDelete = opts.actorRole === "ADMIN";

  // Resolve gym scope before the transaction so we can kick sessions first
  // (names are captured here because rows are gone after the cascade).
  const gymsToRemove = isAdminDelete
    ? await gymRepository.findIdsByOwner(ownerId)
    : [{ id: gym.id, name: gym.name }];
  const gymIds = gymsToRemove.map((g) => g.id);
  const gymNames = gymsToRemove
    .map((g) => ("name" in g && typeof g.name === "string" ? g.name : ""))
    .filter(Boolean);

  const [clerks, memberships] = await Promise.all([
    userRepository.findClerkIdsByGymIds(gymIds),
    membershipRepository.listDistinctUserIdsByGymIds(gymIds),
  ]);

  const kickedClerkIds = clerks.map((c) => c.id);
  const memberUserIds = memberships.map((m) => m.userId);

  // Realtime logout before rows disappear
  for (const clerkId of kickedClerkIds) {
    kickUserSession(
      clerkId,
      "Your account has been removed because the gym was deleted.",
    );
  }

  // Detach + purge clerks, drop gym rows, demote owner when empty — one atomic unit
  const { mustRepurchase } = await gymRepository.deleteGymCascade({
    gymIds,
    ownerId,
    clerkIds: kickedClerkIds,
  });

  for (const userId of memberUserIds) {
    emitMembershipUpdated(userId);
  }

  // Admin deleted the gym — persist a notification so the owner sees it in
  // the NotificationBell even after demote + redirect. Never fail the delete
  // when the notification write fails.
  if (isAdminDelete && opts.actorId !== ownerId) {
    const quoted =
      gymNames.length > 0
        ? gymNames.map((n) => `"${n}"`).join(", ")
        : "your gym";
    const body =
      gymNames.length > 1
        ? `Your gyms ${quoted} were deleted by an admin. You can create a new gym once you have an active owner plan.`
        : `Your gym ${quoted} was deleted by an admin. You can create a new gym once you have an active owner plan.`;
    try {
      await createNotification({
        userId: ownerId,
        type: "GYM_DELETED_BY_ADMIN",
        title: "Gym deleted by admin",
        body,
        data: {
          gymIds,
          gymNames,
          reason: "admin_deleted_gym",
          deletedBy: opts.actorId,
        },
      });
    } catch (error) {
      console.error("Failed to notify owner of admin gym delete:", error);
    }
  }

  // Owner UI must drop every cached clerk/plan/coach/etc. immediately
  emitToUser(ownerId, "owner_gym_cleared", {
    gymIds,
    removedClerks: kickedClerkIds.length,
  });

  if (mustRepurchase) {
    emitToUser(ownerId, "owner_must_repurchase", {
      reason: isAdminDelete ? "admin_deleted_gym" : "owner_deleted_gym",
    });
  }
  void emitAdminUsersUpdated();
  void emitAdminGymsUpdated();

  return { kind: "ok", mustRepurchase, removedClerks: kickedClerkIds.length };
}

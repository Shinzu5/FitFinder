import { MembershipRepository } from "@/repositories/membership.repository";
import { UserRepository } from "@/repositories/user.repository";
import { EmitMembershipUpdatedService as emitMembershipUpdated } from "@/services/realtime/emit-membership-updated-service";
import { EmitMembersUpdatedService as emitMembersUpdated } from "@/services/realtime/emit-members-updated-service";
import { NotifyMembershipExpiredService as notifyMembershipExpired } from "@/services/membership/notify-membership-expired-service";

const membershipRepository = new MembershipRepository();
const userRepository = new UserRepository();

/** Mark overdue ACTIVE/EXPIRING memberships as EXPIRED and notify affected users. */
export async function ExpireOverdueMembershipsService(userId?: string): Promise<number> {
  const overdue = await membershipRepository.listOverdue(userId);

  if (overdue.length === 0) return 0;

  await membershipRepository.expireByIds(overdue.map((m) => m.id));

  // Clear active gym session when that gym's membership expired (multi-gym safe)
  for (const m of overdue) {
    await userRepository.clearActiveGymForGym(m.userId, m.gymId);
  }

  const uniqueUserIds = [...new Set(overdue.map((m) => m.userId))];
  for (const id of uniqueUserIds) {
    emitMembershipUpdated(id);
  }

  const uniqueGymIds = [...new Set(overdue.map((m) => m.gymId))];
  for (const gymId of uniqueGymIds) {
    void emitMembersUpdated(gymId);
  }

  // Persist + realtime inbox notifications (deduped per membership)
  for (const m of overdue) {
    void notifyMembershipExpired({
      userId: m.userId,
      gymId: m.gymId,
      membershipId: m.id,
      gymName: m.gym.name,
    });
  }

  return overdue.length;
}

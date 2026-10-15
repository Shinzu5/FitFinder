import { GymRepository } from "@/repositories/gym.repository";
import { MembershipRepository } from "@/repositories/membership.repository";
import { NotifyMembershipChangeService as notifyMembershipChange } from "@/services/membership/notify-membership-change-service";
import { NotifyMembershipRemovedService as notifyMembershipRemoved } from "@/services/membership/notify-membership-removed-service";

const membershipRepository = new MembershipRepository();
const gymRepository = new GymRepository();

type RemoveOwnerMemberResult = { kind: "not-found" } | { kind: "ok" };

/** DELETE /api/owner/members/:id — remove one member from the owner's gym. */
export async function RemoveOwnerMemberService(input: {
  gymId: string;
  membershipId: string;
}): Promise<RemoveOwnerMemberResult> {
  const membership = await membershipRepository.findMembership({
    where: { id: input.membershipId, gymId: input.gymId },
    select: { id: true, userId: true, gymId: true },
  });
  if (!membership) {
    return { kind: "not-found" };
  }

  const gym = await gymRepository.findById(membership.gymId);

  await membershipRepository.deleteMembership({ where: { id: membership.id } });

  // Persist a bell notification so the removed gymer sees it even after
  // their membership (and dashboard access) disappears. Never fail the
  // removal when the notification write fails.
  try {
    await notifyMembershipRemoved({
      userId: membership.userId,
      gymId: membership.gymId,
      gymName: gym?.name || "",
      membershipId: membership.id,
    });
  } catch (error) {
    console.error("Failed to notify member of owner removal:", error);
  }

  await notifyMembershipChange(membership.userId, membership.gymId);

  return { kind: "ok" };
}

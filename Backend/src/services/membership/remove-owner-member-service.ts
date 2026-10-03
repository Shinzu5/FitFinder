import { MembershipRepository } from "@/repositories/membership.repository";
import { NotifyMembershipChangeService as notifyMembershipChange } from "@/services/membership/notify-membership-change-service";

const membershipRepository = new MembershipRepository();

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

  await membershipRepository.deleteMembership({ where: { id: membership.id } });

  await notifyMembershipChange(membership.userId, membership.gymId);

  return { kind: "ok" };
}

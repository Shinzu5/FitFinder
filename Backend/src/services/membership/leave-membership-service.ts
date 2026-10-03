import { MembershipRepository } from "@/repositories/membership.repository";
import { UserRepository } from "@/repositories/user.repository";
import { EmitMembershipUpdatedService as emitMembershipUpdated } from "@/services/realtime";
import { ResolveActiveGymService as resolveActiveGymId } from "@/services/gym/resolve-active-gym-service";

const membershipRepository = new MembershipRepository();
const userRepository = new UserRepository();

/**
 * DELETE /api/user/membership — leave the currently selected gym only.
 * Expires the live row, drops the session selection, then re-resolves it.
 */
export async function LeaveMembershipService(
  userId: string,
): Promise<{ ok: boolean }> {
  const activeGymId = await resolveActiveGymId(userId);
  if (!activeGymId) {
    return { ok: false };
  }

  const membership = await membershipRepository.findAnyByUserAndGym(
    userId,
    activeGymId,
  );

  if (!membership) {
    return { ok: false };
  }

  await membershipRepository.updateMembership({
    where: { id: membership.id },
    data: { status: "EXPIRED" },
  });

  await userRepository.clearActiveGym(userId);
  await resolveActiveGymId(userId);

  emitMembershipUpdated(userId);
  return { ok: true };
}

import { UserRepository } from "@/repositories/user.repository";
import { MembershipRepository } from "@/repositories/membership.repository";
import { emitToUser } from "@/socket";

const userRepository = new UserRepository();
const membershipRepository = new MembershipRepository();

/** After a membership becomes ACTIVE — set activeGymId only if unset. */
export async function EnsureActiveGymService(userId: string, gymId: string): Promise<void> {
  const user = await userRepository.findActiveGymId(userId);
  if (user?.activeGymId) {
    const stillLive = await membershipRepository.findLiveByUserAndGym(userId, user.activeGymId);
    if (stillLive) return;
  }
  await userRepository.setActiveGym(userId, gymId);
  emitToUser(userId, "active_gym_changed", { gymId });
}

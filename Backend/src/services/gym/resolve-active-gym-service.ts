import { UserRepository } from "@/repositories/user.repository";
import { ListLiveMembershipsService } from "@/services/gym/list-live-memberships-service";

const userRepository = new UserRepository();

/**
 * Resolve the gymer's currently selected gym.
 * Falls back to newest live membership and persists activeGymId when needed.
 */
export async function ResolveActiveGymService(userId: string): Promise<string | null> {
  const live = await ListLiveMembershipsService(userId);
  if (live.length === 0) {
    await userRepository.setActiveGym(userId, null);
    return null;
  }

  const user = await userRepository.findActiveGymId(userId);

  if (user?.activeGymId && live.some((m) => m.gymId === user.activeGymId)) {
    return user.activeGymId;
  }

  const fallback = live[0].gymId;
  await userRepository.setActiveGym(userId, fallback);
  return fallback;
}

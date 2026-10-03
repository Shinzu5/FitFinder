import { GymRepository } from "@/repositories/gym.repository";
import { UserRepository } from "@/repositories/user.repository";
import { emitToUser } from "@/socket";

const gymRepository = new GymRepository();
const userRepository = new UserRepository();

/** Notify gym Owner + Clerks that the shared Members list changed. */
export async function EmitMembersUpdatedService(gymId: string): Promise<void> {
  const [gym, clerks] = await Promise.all([
    gymRepository.findOwnerId(gymId),
    userRepository.findClerkIdsByGym(gymId),
  ]);

  const payload = { gymId };
  if (gym?.ownerId) {
    emitToUser(gym.ownerId, "members_updated", payload);
  }
  for (const clerk of clerks) {
    emitToUser(clerk.id, "members_updated", payload);
  }
}

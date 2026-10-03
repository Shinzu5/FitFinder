import { GymRepository } from "@/repositories/gym.repository";
import { UserRepository } from "@/repositories/user.repository";
import { emitToUser } from "@/socket";

const gymRepository = new GymRepository();
const userRepository = new UserRepository();

/** Notify gym owner + assigned clerks that the approvals list changed. */
export async function EmitWalkInApprovalsUpdatedService(gymId: string): Promise<void> {
  const [gym, clerks] = await Promise.all([
    gymRepository.findOwnerId(gymId),
    userRepository.findStaffIdsByGym(gymId),
  ]);

  const payload = { gymId };
  if (gym?.ownerId) {
    emitToUser(gym.ownerId, "walk_in_approvals_updated", payload);
  }
  for (const clerk of clerks) {
    emitToUser(clerk.id, "walk_in_approvals_updated", payload);
  }
}

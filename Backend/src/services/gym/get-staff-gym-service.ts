import { UserRepository } from "@/repositories/user.repository";
import { GymRepository } from "@/repositories/gym.repository";

const userRepository = new UserRepository();
const gymRepository = new GymRepository();

/**
 * Shared staff gym resolver used by attendance + walk-in flows.
 * OWNER → newest owned gym; CLERK → assigned clerkGymId gym; otherwise null.
 */
export async function GetStaffGymService(userId: string) {
  const user = await userRepository.findRoleAndClerkGymById(userId);
  if (!user) return null;
  if (user.role === "OWNER") {
    return gymRepository.findLatestByOwner(userId);
  }
  if (!user.clerkGymId) return null;
  return gymRepository.findById(user.clerkGymId);
}

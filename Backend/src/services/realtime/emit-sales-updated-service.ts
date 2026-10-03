import { GymRepository } from "@/repositories/gym.repository";
import { UserRepository } from "@/repositories/user.repository";
import { emitToUser } from "@/socket";

const gymRepository = new GymRepository();
const userRepository = new UserRepository();

/** Notify Owner + Clerks that sales / revenue / reports changed. */
export async function EmitSalesUpdatedService(gymId: string): Promise<void> {
  const [gym, clerks] = await Promise.all([
    gymRepository.findOwnerId(gymId),
    userRepository.findClerkIdsByGym(gymId),
  ]);

  const payload = { gymId };
  if (gym?.ownerId) {
    emitToUser(gym.ownerId, "sales_updated", payload);
  }
  for (const clerk of clerks) {
    emitToUser(clerk.id, "sales_updated", payload);
  }
}

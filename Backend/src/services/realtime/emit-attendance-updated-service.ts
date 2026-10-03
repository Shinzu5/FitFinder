import { GymRepository } from "@/repositories/gym.repository";
import { UserRepository } from "@/repositories/user.repository";
import { emitToGym, emitToUser } from "@/socket";

const gymRepository = new GymRepository();
const userRepository = new UserRepository();

/** Notify Owner + Clerks + gym room that attendance / Active Now changed. */
export async function EmitAttendanceUpdatedService(
  gymId: string,
  payload: { activeNow?: number } = {},
): Promise<void> {
  const [gym, clerks] = await Promise.all([
    gymRepository.findOwnerId(gymId),
    userRepository.findClerkIdsByGym(gymId),
  ]);

  const body = { gymId, ...payload };
  if (gym?.ownerId) {
    emitToUser(gym.ownerId, "attendance_updated", body);
  }
  for (const clerk of clerks) {
    emitToUser(clerk.id, "attendance_updated", body);
  }
  // Gymers on home / gym rooms hear Active Now changes
  emitToGym(gymId, "attendance_updated", body);
}

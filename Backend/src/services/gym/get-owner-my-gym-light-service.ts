import { GymRepository } from "@/repositories/gym.repository";

const gymRepository = new GymRepository();

/**
 * GET /api/owner/my-gym ?light=1 — tiny ownership-check payload
 * (avoids lag / pool pressure) with one reconnect retry.
 */
export async function GetOwnerMyGymLightService(ownerId: string) {
  return gymRepository.findLatestLightByOwnerWithRetry(ownerId);
}

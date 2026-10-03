import { GymRepository } from "@/repositories/gym.repository";

const gymRepository = new GymRepository();

/**
 * GET /api/owner/my-gym — full payload with _count + membership plans,
 * one reconnect retry (transient Neon pool drops).
 */
export async function GetOwnerMyGymService(ownerId: string) {
  return gymRepository.findLatestWithCountsByOwnerWithRetry(ownerId);
}

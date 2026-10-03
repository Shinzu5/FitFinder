import { GymRepository } from "@/repositories/gym.repository";

const gymRepository = new GymRepository();

// Helper: get the owner's gym
export async function GetOwnerGymService(ownerId: string) {
  return gymRepository.findLatestByOwner(ownerId);
}

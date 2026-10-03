import { GymRepository } from "@/repositories/gym.repository";

const gymRepository = new GymRepository();

/** GET /api/gyms/:id — public gym detail (owner, active plans, catalog, counts). */
export async function GetPublicGymService(gymId: string) {
  return gymRepository.findByIdWithPublicDetail(gymId);
}

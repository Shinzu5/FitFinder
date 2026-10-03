import { CatalogRepository } from "@/repositories/catalog.repository";
import { GymRepository } from "@/repositories/gym.repository";
import { emitToGym, emitToUser } from "@/socket";

const catalogRepository = new CatalogRepository();
const gymRepository = new GymRepository();

/**
 * Broadcast coaches for this gym.
 * - Gym room (Gymers): ACTIVE only — inactive/deleted disappear from booking UI.
 * - Owner: full list (active + inactive) for Coaches management.
 */
export async function EmitCoachesUpdatedService(gymId: string): Promise<void> {
  const [coaches, gym] = await Promise.all([
    catalogRepository.listByGym(gymId),
    gymRepository.findOwnerId(gymId),
  ]);

  const activeCoaches = coaches.filter((c) => c.isActive);
  emitToGym(gymId, "coaches_updated", { gymId, coaches: activeCoaches });

  if (gym?.ownerId) {
    emitToUser(gym.ownerId, "coaches_updated", {
      gymId,
      coaches,
      scope: "owner",
    });
  }
}

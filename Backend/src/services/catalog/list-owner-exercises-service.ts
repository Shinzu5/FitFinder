import { CatalogRepository } from "@/repositories/catalog.repository";

const catalogRepository = new CatalogRepository();

/** GET /api/owner/exercises — exercises for the owner's gym. */
export async function ListOwnerExercisesService(gymId: string) {
  return catalogRepository.listByGymUnordered(gymId);
}

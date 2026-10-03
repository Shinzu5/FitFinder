import { CatalogRepository } from "@/repositories/catalog.repository";

const catalogRepository = new CatalogRepository();

/** GET /api/user/exercises — member-only exercises for the selected gym. */
export async function ListMemberExercisesService(gymId: string) {
  return catalogRepository.listByGymRecent(gymId);
}

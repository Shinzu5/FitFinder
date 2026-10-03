import { CatalogRepository } from "@/repositories/catalog.repository";

const catalogRepository = new CatalogRepository();

/** GET /api/owner/coaches — coaches for the owner's gym, oldest first. */
export async function ListOwnerCoachesService(gymId: string) {
  return catalogRepository.listByGym(gymId);
}

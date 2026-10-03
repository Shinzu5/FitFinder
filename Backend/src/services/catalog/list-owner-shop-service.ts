import { CatalogRepository } from "@/repositories/catalog.repository";

const catalogRepository = new CatalogRepository();

/** GET /api/owner/shop — products for the owner's gym, newest first. */
export async function ListOwnerShopService(gymId: string) {
  return catalogRepository.listShopByGym(gymId);
}

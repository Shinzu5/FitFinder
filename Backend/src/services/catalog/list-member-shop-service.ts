import { CatalogRepository } from "@/repositories/catalog.repository";

const catalogRepository = new CatalogRepository();

/** GET /api/user/shop — member-only shop products for the selected gym. */
export async function ListMemberShopService(gymId: string) {
  return catalogRepository.listShopByGym(gymId);
}

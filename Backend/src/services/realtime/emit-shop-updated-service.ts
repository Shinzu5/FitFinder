import { CatalogRepository } from "@/repositories/catalog.repository";
import { emitToGym } from "@/socket";

const catalogRepository = new CatalogRepository();

/** Broadcast shop products to gym room (Owner CRUD → Gymer Shop page). */
export async function EmitShopUpdatedService(gymId: string): Promise<void> {
  const products = await catalogRepository.listShopByGym(gymId);
  emitToGym(gymId, "shop_updated", { gymId, products });
}

import { CatalogRepository } from "@/repositories/catalog.repository";
import { EmitShopUpdatedService as emitShopUpdated } from "@/services/realtime/emit-shop-updated-service";

const catalogRepository = new CatalogRepository();

type RemoveShopProductResult = { kind: "not-found" } | { kind: "ok" };

/** DELETE /api/owner/shop/:id */
export async function RemoveShopProductService(input: {
  gymId: string;
  productId: string;
}): Promise<RemoveShopProductResult> {
  const existing = await catalogRepository.findShopByIdAndGym(
    input.productId,
    input.gymId,
  );
  if (!existing) {
    return { kind: "not-found" };
  }

  await catalogRepository.deleteShopById(existing.id);
  void emitShopUpdated(input.gymId);

  return { kind: "ok" };
}

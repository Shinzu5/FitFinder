import { CatalogRepository } from "@/repositories/catalog.repository";
import { EmitShopUpdatedService as emitShopUpdated } from "@/services/realtime/emit-shop-updated-service";

const catalogRepository = new CatalogRepository();

type UpdateShopProductResult =
  | { kind: "not-found" }
  | { kind: "ok"; product: Awaited<ReturnType<CatalogRepository["updateShopProduct"]>> };

/** PUT /api/owner/shop/:id — update name/price/image for live Gymer sync. */
export async function UpdateShopProductService(input: {
  gymId: string;
  productId: string;
  body: any;
}): Promise<UpdateShopProductResult> {
  const existing = await catalogRepository.findShopByIdAndGym(
    input.productId,
    input.gymId,
  );
  if (!existing) {
    return { kind: "not-found" };
  }

  const body = input.body;
  const data: Record<string, unknown> = {};
  if (typeof body.name === "string") data.name = body.name.trim();
  if (typeof body.price === "number") data.price = body.price;
  if (typeof body.imageUrl === "string") data.imageUrl = body.imageUrl;
  if (body.imageName !== undefined) data.imageName = body.imageName;

  const product = await catalogRepository.updateShopProduct({
    where: { id: existing.id },
    data,
  });

  void emitShopUpdated(input.gymId);

  return { kind: "ok", product };
}

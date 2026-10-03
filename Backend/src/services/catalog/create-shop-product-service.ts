import { CatalogRepository } from "@/repositories/catalog.repository";
import { EmitShopUpdatedService as emitShopUpdated } from "@/services/realtime/emit-shop-updated-service";

const catalogRepository = new CatalogRepository();

/** POST /api/owner/shop — add a product to the owner's gym. */
export async function CreateShopProductService(input: {
  gymId: string;
  body: any;
}) {
  const { gymId, body } = input;

  const product = await catalogRepository.createShopProduct({
    data: {
      gymId,
      name: body.name,
      price: body.price,
      imageUrl: body.imageUrl || "",
      imageName: body.imageName || null,
    },
  });

  void emitShopUpdated(gymId);

  return product;
}

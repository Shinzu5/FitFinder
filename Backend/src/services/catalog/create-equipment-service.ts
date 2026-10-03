import { CatalogRepository } from "@/repositories/catalog.repository";
import { EmitEquipmentUpdatedService as emitEquipmentUpdated } from "@/services/realtime/emit-equipment-updated-service";

const catalogRepository = new CatalogRepository();

/** POST /api/owner/equipment — add equipment to the owner's gym. */
export async function CreateEquipmentService(input: {
  gymId: string;
  body: any;
}) {
  const { gymId, body } = input;

  const rawStatus = String(body.status || "AVAILABLE").toUpperCase().replace(/[\s-]+/g, "_");
  const allowed = ["AVAILABLE", "IN_USE", "UNDER_MAINTENANCE"] as const;
  const status = (allowed as readonly string[]).includes(rawStatus)
    ? (rawStatus as (typeof allowed)[number])
    : "AVAILABLE";

  const item = await catalogRepository.createEquipment({
    data: {
      gymId,
      name: body.name,
      quantity: body.quantity,
      status,
      imageUrl: typeof body.imageUrl === "string" ? body.imageUrl : "",
      imageName: body.imageName ?? null,
    },
  });

  void emitEquipmentUpdated(gymId);

  return item;
}

import { CatalogRepository } from "@/repositories/catalog.repository";
import { EmitEquipmentUpdatedService as emitEquipmentUpdated } from "@/services/realtime/emit-equipment-updated-service";

const catalogRepository = new CatalogRepository();

type UpdateEquipmentResult =
  | { kind: "not-found" }
  | { kind: "ok"; updated: Awaited<ReturnType<CatalogRepository["updateEquipment"]>> };

/** PUT /api/owner/equipment/:id — update name/quantity/status. */
export async function UpdateEquipmentService(input: {
  gymId: string;
  equipmentId: string;
  body: any;
}): Promise<UpdateEquipmentResult> {
  const existing = await catalogRepository.findEquipmentByIdAndGym(
    input.equipmentId,
    input.gymId,
  );
  if (!existing) {
    return { kind: "not-found" };
  }

  const body = input.body;
  const data: Record<string, unknown> = {};
  if (typeof body.name === "string") data.name = body.name;
  if (typeof body.quantity === "number") data.quantity = body.quantity;
  if (typeof body.status === "string") {
    const rawStatus = body.status.toUpperCase().replace(/[\s-]+/g, "_");
    const allowed = ["AVAILABLE", "IN_USE", "UNDER_MAINTENANCE"];
    if (allowed.includes(rawStatus)) data.status = rawStatus;
  }
  if (typeof body.imageUrl === "string") data.imageUrl = body.imageUrl;
  if (body.imageName !== undefined) data.imageName = body.imageName;

  const updated = await catalogRepository.updateEquipment({
    where: { id: existing.id },
    data,
  });

  void emitEquipmentUpdated(input.gymId);

  return { kind: "ok", updated };
}

import { CatalogRepository } from "@/repositories/catalog.repository";
import { EmitEquipmentUpdatedService as emitEquipmentUpdated } from "@/services/realtime/emit-equipment-updated-service";

const catalogRepository = new CatalogRepository();

type RemoveEquipmentResult = { kind: "not-found" } | { kind: "ok" };

/** DELETE /api/owner/equipment/:id */
export async function RemoveEquipmentService(input: {
  gymId: string;
  equipmentId: string;
}): Promise<RemoveEquipmentResult> {
  const existing = await catalogRepository.findEquipmentByIdAndGym(
    input.equipmentId,
    input.gymId,
  );
  if (!existing) {
    return { kind: "not-found" };
  }

  await catalogRepository.deleteEquipmentById(existing.id);
  void emitEquipmentUpdated(input.gymId);

  return { kind: "ok" };
}

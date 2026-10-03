import { CatalogRepository } from "@/repositories/catalog.repository";
import { EmitEquipmentUpdatedService as emitEquipmentUpdated } from "@/services/realtime/emit-equipment-updated-service";

const catalogRepository = new CatalogRepository();

type ToggleEquipmentResult =
  | { kind: "not-found" }
  | { kind: "ok"; updated: Awaited<ReturnType<CatalogRepository["updateEquipment"]>> };

/**
 * PUT /api/owner/equipment/:id/toggle
 * Cycle Available → In Use → Under Maintenance.
 */
export async function ToggleEquipmentService(input: {
  gymId: string;
  equipmentId: string;
}): Promise<ToggleEquipmentResult> {
  const item = await catalogRepository.findEquipmentByIdAndGym(
    input.equipmentId,
    input.gymId,
  );
  if (!item) {
    return { kind: "not-found" };
  }

  const nextStatus =
    item.status === "AVAILABLE"
      ? "IN_USE"
      : item.status === "IN_USE"
        ? "UNDER_MAINTENANCE"
        : "AVAILABLE";

  const updated = await catalogRepository.updateEquipment({
    where: { id: item.id },
    data: { status: nextStatus },
  });

  void emitEquipmentUpdated(input.gymId);

  return { kind: "ok", updated };
}

import { CatalogRepository } from "@/repositories/catalog.repository";
import { emitToGym } from "@/socket";

const catalogRepository = new CatalogRepository();

/** Broadcast equipment list to gym room (Owner CRUD → Gymer Equipment page). */
export async function EmitEquipmentUpdatedService(gymId: string): Promise<void> {
  const equipment = await catalogRepository.listEquipmentByGymOrdered(gymId);
  emitToGym(gymId, "equipment_updated", { gymId, equipment });
}

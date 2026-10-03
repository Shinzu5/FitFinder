import { CatalogRepository } from "@/repositories/catalog.repository";

const catalogRepository = new CatalogRepository();

/** GET /api/owner/equipment — equipment for the owner's gym. */
export async function ListOwnerEquipmentService(gymId: string) {
  return catalogRepository.listEquipmentByGym(gymId);
}

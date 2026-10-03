import { CatalogRepository } from "@/repositories/catalog.repository";

const catalogRepository = new CatalogRepository();

/** GET /api/user/equipment — member-only equipment for the selected gym. */
export async function ListMemberEquipmentService(gymId: string) {
  return catalogRepository.listEquipmentByGymOrdered(gymId);
}

import { CatalogRepository } from "@/repositories/catalog.repository";
import { EmitCoachesUpdatedService as emitCoachesUpdated } from "@/services/realtime/emit-coaches-updated-service";

const catalogRepository = new CatalogRepository();

type RemoveCoachResult = { kind: "not-found" } | { kind: "ok" };

/** DELETE /api/owner/coaches/:id — remove a coach of the owner's gym. */
export async function RemoveCoachService(input: {
  gymId: string;
  coachId: string;
}): Promise<RemoveCoachResult> {
  const existing = await catalogRepository.findByIdAndGym(input.coachId, input.gymId);
  if (!existing) {
    return { kind: "not-found" };
  }

  await catalogRepository.deleteCoachById(existing.id);
  void emitCoachesUpdated(input.gymId);

  return { kind: "ok" };
}

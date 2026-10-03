import { CatalogRepository } from "@/repositories/catalog.repository";
import { EmitCoachesUpdatedService as emitCoachesUpdated } from "@/services/realtime/emit-coaches-updated-service";

const catalogRepository = new CatalogRepository();

type UpdateCoachResult =
  | { kind: "not-found" }
  | { kind: "ok"; coach: Awaited<ReturnType<CatalogRepository["updateCoach"]>> };

/** PUT /api/owner/coaches/:id — update a coach of the owner's gym. */
export async function UpdateCoachService(input: {
  gymId: string;
  coachId: string;
  body: any;
}): Promise<UpdateCoachResult> {
  const existing = await catalogRepository.findByIdAndGym(input.coachId, input.gymId);
  if (!existing) {
    return { kind: "not-found" };
  }

  const body = input.body;
  const coach = await catalogRepository.updateCoach({
    where: { id: existing.id },
    data: {
      name: body.name ?? existing.name,
      specialty: body.specialty ?? existing.specialty,
      sessionPrice:
        body.sessionPrice !== undefined
          ? Number(body.sessionPrice)
          : existing.sessionPrice,
      description:
        body.description !== undefined
          ? String(body.description)
          : existing.description,
      photoUrl: body.photoUrl !== undefined ? body.photoUrl : existing.photoUrl,
      photoName: body.photoName !== undefined ? body.photoName : existing.photoName,
      schedule: body.schedule ?? existing.schedule,
      isActive:
        typeof body.isActive === "boolean" ? body.isActive : existing.isActive,
    },
  });

  void emitCoachesUpdated(input.gymId);

  return { kind: "ok", coach };
}

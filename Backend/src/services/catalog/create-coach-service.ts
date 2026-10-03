import { CatalogRepository } from "@/repositories/catalog.repository";
import { EmitCoachesUpdatedService as emitCoachesUpdated } from "@/services/realtime/emit-coaches-updated-service";

const catalogRepository = new CatalogRepository();

/** POST /api/owner/coaches — add a coach to the owner's gym. */
export async function CreateCoachService(input: { gymId: string; body: any }) {
  const { gymId, body } = input;

  const coach = await catalogRepository.createCoach({
    data: {
      gymId,
      name: body.name,
      specialty: body.specialty,
      sessionPrice: body.sessionPrice,
      description: body.description || "",
      photoUrl: body.photoUrl || null,
      photoName: body.photoName || null,
      schedule: body.schedule || {},
      isActive: body.isActive === false ? false : true,
    },
  });

  void emitCoachesUpdated(gymId);

  return coach;
}

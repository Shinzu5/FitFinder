import { CatalogRepository } from "@/repositories/catalog.repository";

const catalogRepository = new CatalogRepository();

type RemoveExerciseResult = { kind: "not-found" } | { kind: "ok" };

/** DELETE /api/owner/exercises/:id */
export async function RemoveExerciseService(input: {
  gymId: string;
  exerciseId: string;
}): Promise<RemoveExerciseResult> {
  const existing = await catalogRepository.findExerciseByIdAndGym(
    input.exerciseId,
    input.gymId,
  );
  if (!existing) {
    return { kind: "not-found" };
  }

  await catalogRepository.deleteExerciseById(existing.id);

  return { kind: "ok" };
}

import { CatalogRepository } from "@/repositories/catalog.repository";

const catalogRepository = new CatalogRepository();

type UpdateExerciseResult =
  | { kind: "not-found" }
  | { kind: "ok"; exercise: Awaited<ReturnType<CatalogRepository["updateExercise"]>> };

/** PUT /api/owner/exercises/:id */
export async function UpdateExerciseService(input: {
  gymId: string;
  exerciseId: string;
  body: any;
}): Promise<UpdateExerciseResult> {
  const existing = await catalogRepository.findExerciseByIdAndGym(
    input.exerciseId,
    input.gymId,
  );
  if (!existing) {
    return { kind: "not-found" };
  }

  const body = input.body;
  const exercise = await catalogRepository.updateExercise({
    where: { id: existing.id },
    data: {
      name: body.name ?? existing.name,
      muscle: body.muscle ?? existing.muscle,
      category: body.category ?? body.muscle ?? existing.category,
      difficulty: body.difficulty ?? existing.difficulty,
      sets: body.sets ?? existing.sets,
      reps: body.reps ?? existing.reps,
      rest: body.rest ?? existing.rest,
      targetMuscles: body.targetMuscles ?? body.muscle ?? existing.targetMuscles,
      formTips: body.formTips ?? existing.formTips,
      mediaUrl: body.mediaUrl !== undefined ? body.mediaUrl : existing.mediaUrl,
      mediaType: body.mediaType !== undefined ? body.mediaType : existing.mediaType,
      mediaName: body.mediaName !== undefined ? body.mediaName : existing.mediaName,
      cardImageUrl: body.cardImageUrl ?? existing.cardImageUrl,
    },
  });

  return { kind: "ok", exercise };
}

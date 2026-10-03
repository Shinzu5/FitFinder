import { CatalogRepository } from "@/repositories/catalog.repository";

const catalogRepository = new CatalogRepository();

/** POST /api/owner/exercises — add an exercise to the owner's gym. */
export async function CreateExerciseService(input: { gymId: string; body: any }) {
  const { gymId, body } = input;

  const exercise = await catalogRepository.createExercise({
    data: {
      gymId,
      name: body.name,
      muscle: body.muscle,
      category: body.category || body.muscle || "",
      difficulty: body.difficulty || "Beginner",
      sets: body.sets || "3",
      reps: body.reps || "8-12",
      rest: body.rest || "60s",
      targetMuscles: body.targetMuscles || body.muscle || "",
      formTips: body.formTips || "",
      mediaUrl: body.mediaUrl || null,
      mediaType: body.mediaType || null,
      mediaName: body.mediaName || null,
      cardImageUrl: body.cardImageUrl || "",
    },
  });

  return exercise;
}

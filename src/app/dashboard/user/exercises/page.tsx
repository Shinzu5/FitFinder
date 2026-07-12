"use client";

import { useState } from "react";
import type { GymExercise } from "@/stores/owner-exercises-store";
import { useOwnerExercisesStore } from "@/stores/owner-exercises-store";
import { ExerciseCard } from "../_components/ExerciseCard";
import { ExerciseGuideModal } from "../_components/ExerciseGuideModal";

export default function ExercisesPage() {
  const exercises = useOwnerExercisesStore((state) => state.exercises);
  const [selectedExercise, setSelectedExercise] = useState<GymExercise | null>(null);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="text-3xl font-bold text-white">Gym Exercises Library</h1>

      {exercises.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800/70 bg-[#0e0e10] p-10 text-center">
          <p className="text-sm text-zinc-400">
            Your gym hasn&apos;t published any exercises yet. Check back soon.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {exercises.map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              onViewGuide={() => setSelectedExercise(exercise)}
            />
          ))}
        </div>
      )}

      <ExerciseGuideModal
        exercise={selectedExercise}
        onClose={() => setSelectedExercise(null)}
      />
    </div>
  );
}

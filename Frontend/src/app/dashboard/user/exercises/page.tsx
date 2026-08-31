"use client";

import { useEffect, useState } from "react";
import type { GymExercise } from "@/stores/owner-exercises-store";
import { useMemberGymContentStore } from "@/stores/member-gym-content-store";
import { useRequireLiveMembership } from "@/hooks/useRequireLiveMembership";
import { ExerciseCard } from "../_components/ExerciseCard";
import { ExerciseGuideModal } from "../_components/ExerciseGuideModal";

export default function ExercisesPage() {
  const { allowed, joinedGymId } = useRequireLiveMembership();
  const exercises = useMemberGymContentStore((state) => state.exercises);
  const loading = useMemberGymContentStore((state) => state.loadingExercises);
  const error = useMemberGymContentStore((state) => state.exercisesError);
  const fetchExercises = useMemberGymContentStore((state) => state.fetchExercises);
  const [selectedExercise, setSelectedExercise] = useState<GymExercise | null>(null);

  useEffect(() => {
    if (!allowed || !joinedGymId) return;
    void fetchExercises();
    const onFocus = () => void fetchExercises();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [allowed, joinedGymId, fetchExercises]);

  if (!allowed || !joinedGymId) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-zinc-500">
        Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="text-3xl font-bold text-white">Gym Exercises Library</h1>

      {loading && exercises.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800/70 bg-[#0e0e10] p-10 text-center">
          <p className="text-sm text-zinc-400">Loading exercises…</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-zinc-800/70 bg-[#0e0e10] p-10 text-center">
          <p className="text-sm text-zinc-400">{error}</p>
        </div>
      ) : exercises.length === 0 ? (
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

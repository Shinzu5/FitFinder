"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { GymExercise } from "@/stores/owner-exercises-store";
import { useMembershipStore } from "@/stores/membership-store";
import { useMemberGymContentStore } from "@/stores/member-gym-content-store";
import { ExerciseCard } from "../_components/ExerciseCard";
import { ExerciseGuideModal } from "../_components/ExerciseGuideModal";

export default function ExercisesPage() {
  const router = useRouter();
  const joinedGymId = useMembershipStore((state) => state.joinedGymId);
  const fetchMembership = useMembershipStore((state) => state.fetchMembership);
  const exercises = useMemberGymContentStore((state) => state.exercises);
  const loading = useMemberGymContentStore((state) => state.loadingExercises);
  const error = useMemberGymContentStore((state) => state.exercisesError);
  const fetchExercises = useMemberGymContentStore((state) => state.fetchExercises);
  const [selectedExercise, setSelectedExercise] = useState<GymExercise | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      await fetchMembership();
      setReady(true);
    })();
  }, [fetchMembership]);

  useEffect(() => {
    if (!ready) return;
    if (!joinedGymId) {
      router.replace("/dashboard/user");
      return;
    }
    void fetchExercises();
    const onFocus = () => void fetchExercises();
    window.addEventListener("focus", onFocus);
    const id = window.setInterval(() => void fetchExercises(), 15000);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(id);
    };
  }, [ready, joinedGymId, fetchExercises, router]);

  if (!ready || !joinedGymId) {
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

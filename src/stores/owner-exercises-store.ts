"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type ExerciseMediaType = "image" | "video";

export interface GymExercise {
  id: string;
  name: string;
  muscle: string;
  difficulty: string;
  mediaUrl: string | null;
  mediaType: ExerciseMediaType | null;
  mediaName: string | null;
}

export type GymExerciseInput = Omit<GymExercise, "id">;

const DEFAULT_EXERCISES: GymExercise[] = [
  {
    id: "exercise-1",
    name: "Barbell Back Squat",
    muscle: "Legs",
    difficulty: "Intermediate",
    mediaUrl: null,
    mediaType: null,
    mediaName: null,
  },
  {
    id: "exercise-2",
    name: "Bench Press",
    muscle: "Chest",
    difficulty: "Beginner",
    mediaUrl: null,
    mediaType: null,
    mediaName: null,
  },
  {
    id: "exercise-3",
    name: "Deadlift",
    muscle: "Back/Legs",
    difficulty: "Advanced",
    mediaUrl: null,
    mediaType: null,
    mediaName: null,
  },
];

interface OwnerExercisesState {
  exercises: GymExercise[];
  addExercise: (exercise: GymExerciseInput) => void;
  removeExercise: (id: string) => void;
}

export const useOwnerExercisesStore = create<OwnerExercisesState>()(
  persist(
    (set, get) => ({
      exercises: DEFAULT_EXERCISES,

      addExercise: (exercise) => {
        set({
          exercises: [
            ...get().exercises,
            {
              id: `exercise-${Date.now()}`,
              name: exercise.name.trim(),
              muscle: exercise.muscle.trim(),
              difficulty: exercise.difficulty.trim(),
              mediaUrl: exercise.mediaUrl,
              mediaType: exercise.mediaType,
              mediaName: exercise.mediaName,
            },
          ],
        });
      },

      removeExercise: (id) => {
        set({ exercises: get().exercises.filter((exercise) => exercise.id !== id) });
      },
    }),
    {
      name: "fitfinder-owner-exercises",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export function getDifficultyStyles(difficulty: string) {
  const value = difficulty.toLowerCase();
  if (value.includes("beginner")) {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
  }
  if (value.includes("advanced")) {
    return "border-red-500/30 bg-red-500/10 text-red-400";
  }
  return "border-amber-500/30 bg-amber-500/10 text-amber-400";
}

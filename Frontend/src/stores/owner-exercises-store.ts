"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import api from "@/lib/api";

export type ExerciseMediaType = "image" | "video";

export interface GymExercise {
  id: string;
  name: string;
  muscle: string;
  category: string;
  difficulty: string;
  sets: string;
  reps: string;
  rest: string;
  targetMuscles: string;
  formTips: string;
  mediaUrl: string | null;
  mediaType: ExerciseMediaType | null;
  mediaName: string | null;
  cardImageUrl: string;
}

export type GymExerciseInput = Omit<GymExercise, "id">;

interface OwnerExercisesState {
  exercises: GymExercise[];
  loading: boolean;
  fetchExercises: () => Promise<void>;
  addExercise: (exercise: GymExerciseInput) => Promise<void>;
  removeExercise: (id: string) => Promise<void>;
}

export const useOwnerExercisesStore = create<OwnerExercisesState>()(
  persist(
    (set, get) => ({
      exercises: [],
      loading: false,

      fetchExercises: async () => {
        set({ loading: true });
        try {
          const { data } = await api.get("/owner/exercises");
          if (data.success) {
            set({ exercises: data.data, loading: false });
            return;
          }
        } catch (error) {
          console.error("Failed to fetch exercises:", error);
        }
        set({ loading: false });
      },

      addExercise: async (exercise) => {
        try {
          const { data } = await api.post("/owner/exercises", exercise);
          if (data.success) {
            set({ exercises: [...get().exercises, data.data] });
            return;
          }
        } catch (error) {
          console.error("Failed to add exercise:", error);
        }
        set({
          exercises: [
            ...get().exercises,
            {
              id: `exercise-${Date.now()}`,
              ...exercise,
              category: exercise.category || exercise.muscle,
              cardImageUrl: exercise.cardImageUrl || "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80",
            },
          ],
        });
      },

      removeExercise: async (id) => {
        try {
          await api.delete(`/owner/exercises/${id}`);
        } catch (error) {
          console.error("Failed to remove exercise:", error);
        }
        set({ exercises: get().exercises.filter((e) => e.id !== id) });
      },
    }),
    {
      name: "fitfinder-owner-exercises",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export function getUserDifficultyStyles(difficulty: string) {
  const value = difficulty.toLowerCase();
  if (value.includes("beginner")) {
    return "border-zinc-600 text-zinc-400";
  }
  return "border-white/25 text-zinc-200";
}

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

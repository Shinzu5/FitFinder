"use client";

import { create } from "zustand";
import api from "@/lib/api";
import { resolveMediaUrl } from "@/lib/media";

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

function mapExercise(raw: any): GymExercise {
  return {
    id: raw.id,
    name: raw.name,
    muscle: raw.muscle,
    category: raw.category || raw.muscle || "",
    difficulty: raw.difficulty || "Beginner",
    sets: raw.sets || "3",
    reps: raw.reps || "8-12",
    rest: raw.rest || "60s",
    targetMuscles: raw.targetMuscles || raw.muscle || "",
    formTips: raw.formTips || "",
    mediaUrl: raw.mediaUrl ? resolveMediaUrl(raw.mediaUrl) : null,
    mediaType: (raw.mediaType as ExerciseMediaType) || null,
    mediaName: raw.mediaName || null,
    cardImageUrl: resolveMediaUrl(
      raw.cardImageUrl || (raw.mediaType === "image" ? raw.mediaUrl : ""),
      "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80",
    ),
  };
}

interface OwnerExercisesState {
  exercises: GymExercise[];
  loading: boolean;
  fetchExercises: () => Promise<void>;
  addExercise: (exercise: GymExerciseInput) => Promise<void>;
  updateExercise: (id: string, exercise: GymExerciseInput) => Promise<void>;
  removeExercise: (id: string) => Promise<void>;
}

export const useOwnerExercisesStore = create<OwnerExercisesState>((set, get) => ({
  exercises: [],
  loading: false,

  fetchExercises: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get("/owner/exercises");
      if (data.success) {
        set({ exercises: (data.data || []).map(mapExercise), loading: false });
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
        set({ exercises: [...get().exercises, mapExercise(data.data)] });
      }
    } catch (error) {
      console.error("Failed to add exercise:", error);
    }
  },

  updateExercise: async (id, exercise) => {
    try {
      const { data } = await api.put(`/owner/exercises/${id}`, exercise);
      if (data.success) {
        set({
          exercises: get().exercises.map((item) =>
            item.id === id ? mapExercise(data.data) : item,
          ),
        });
      }
    } catch (error) {
      console.error("Failed to update exercise:", error);
    }
  },

  removeExercise: async (id) => {
    try {
      const { data } = await api.delete(`/owner/exercises/${id}`);
      if (data.success) {
        set({ exercises: get().exercises.filter((e) => e.id !== id) });
      }
    } catch (error) {
      console.error("Failed to remove exercise:", error);
    }
  },
}));

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

"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

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

const DEFAULT_EXERCISES: GymExercise[] = [
  {
    id: "exercise-1",
    name: "Barbell Back Squat",
    muscle: "Legs",
    category: "Lower Body",
    difficulty: "Intermediate",
    sets: "4",
    reps: "6-8",
    rest: "90s",
    targetMuscles: "Legs (Quads, Glutes, Hamstrings)",
    formTips:
      "Keep your chest up, knees tracking over toes, descend until thighs are parallel to the floor. Drive through your heels.",
    mediaUrl: null,
    mediaType: null,
    mediaName: null,
    cardImageUrl:
      "https://images.unsplash.com/photo-1574680096145-d05b474e2a4c?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "exercise-2",
    name: "Bench Press",
    muscle: "Chest",
    category: "Upper Body — Chest",
    difficulty: "Beginner",
    sets: "3",
    reps: "8-10",
    rest: "60s",
    targetMuscles: "Chest (Pectorals), Triceps, Front Delts",
    formTips:
      "Retract your shoulder blades, lower the bar to mid-chest with control, and press up without flaring elbows excessively.",
    mediaUrl: null,
    mediaType: null,
    mediaName: null,
    cardImageUrl:
      "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "exercise-3",
    name: "Deadlift",
    muscle: "Back/Legs",
    category: "Full Body",
    difficulty: "Advanced",
    sets: "4",
    reps: "3-5",
    rest: "120s",
    targetMuscles: "Posterior Chain (Hamstrings, Glutes, Erectors, Lats)",
    formTips:
      "Brace your core, hinge at the hips, keep the bar close to your body, and stand tall without hyperextending at the top.",
    mediaUrl: null,
    mediaType: null,
    mediaName: null,
    cardImageUrl:
      "https://images.unsplash.com/photo-1605296867304-46d5465a13f1?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "exercise-4",
    name: "Tricep Pushdown",
    muscle: "Arms",
    category: "Upper Body — Arms",
    difficulty: "Beginner",
    sets: "3",
    reps: "12-15",
    rest: "45s",
    targetMuscles: "Triceps (Long, Lateral, Medial Heads)",
    formTips:
      "Keep elbows pinned to your sides, extend fully at the bottom, and control the return without swinging your torso.",
    mediaUrl: null,
    mediaType: null,
    mediaName: null,
    cardImageUrl:
      "https://images.unsplash.com/photo-1581009146145-b5ef050c149a?auto=format&fit=crop&w=800&q=80",
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
              category: exercise.category?.trim() || exercise.muscle.trim(),
              difficulty: exercise.difficulty.trim(),
              sets: exercise.sets?.trim() || "3",
              reps: exercise.reps?.trim() || "8-12",
              rest: exercise.rest?.trim() || "60s",
              targetMuscles: exercise.targetMuscles?.trim() || exercise.muscle.trim(),
              formTips: exercise.formTips?.trim() || "Follow your coach's cues and move with control.",
              mediaUrl: exercise.mediaUrl,
              mediaType: exercise.mediaType,
              mediaName: exercise.mediaName,
              cardImageUrl:
                exercise.cardImageUrl ||
                "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80",
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

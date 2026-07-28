"use client";

import type { GymExercise } from "@/stores/owner-exercises-store";
import { getUserDifficultyStyles } from "@/stores/owner-exercises-store";

function getCardImage(exercise: GymExercise) {
  if (exercise.mediaType === "image" && exercise.mediaUrl) {
    return exercise.mediaUrl;
  }
  return (
    exercise.cardImageUrl ??
    "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80"
  );
}

interface ExerciseCardProps {
  exercise: GymExercise;
  onViewGuide: () => void;
}

export function ExerciseCard({ exercise, onViewGuide }: ExerciseCardProps) {
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-zinc-800/70 bg-[#0e0e10]">
      <div className="relative h-44 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={getCardImage(exercise)}
          alt={exercise.name}
          className="h-full w-full object-cover grayscale transition duration-300 hover:grayscale-0"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e10]/80 to-transparent" />
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-bold text-white">{exercise.name}</h3>
            <p className="mt-0.5 text-xs text-zinc-500">{exercise.category ?? exercise.muscle}</p>
          </div>
          <span
            className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${getUserDifficultyStyles(exercise.difficulty)}`}
          >
            {exercise.difficulty}
          </span>
        </div>

        <button
          type="button"
          onClick={onViewGuide}
          className="mt-4 w-full rounded-xl border border-zinc-800 bg-zinc-900 py-2.5 text-sm font-semibold text-white transition hover:border-zinc-700 hover:bg-zinc-800"
        >
          View Guide
        </button>
      </div>
    </article>
  );
}

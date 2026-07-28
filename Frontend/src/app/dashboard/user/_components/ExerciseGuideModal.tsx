"use client";

import { X } from "lucide-react";
import type { GymExercise } from "@/stores/owner-exercises-store";
import { getUserDifficultyStyles } from "@/stores/owner-exercises-store";

interface ExerciseGuideModalProps {
  exercise: GymExercise | null;
  onClose: () => void;
}

function GuideMedia({ exercise }: { exercise: GymExercise }) {
  if (exercise.mediaUrl && exercise.mediaType === "video") {
    return (
      <video
        src={exercise.mediaUrl}
        controls
        playsInline
        className="h-full w-full object-cover"
      >
        Your browser does not support video playback.
      </video>
    );
  }

  if (exercise.mediaUrl && exercise.mediaType === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={exercise.mediaUrl} alt={exercise.name} className="h-full w-full object-cover" />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={
        exercise.cardImageUrl ??
        "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80"
      }
      alt={exercise.name}
      className="h-full w-full object-cover grayscale"
    />
  );
}

export function ExerciseGuideModal({ exercise, onClose }: ExerciseGuideModalProps) {
  if (!exercise) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close guide"
      />
      <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-800/70 bg-[#0e0e10] shadow-2xl">
        <div className="relative h-56 overflow-hidden bg-black sm:h-64">
          <GuideMedia exercise={exercise} />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          <div>
            <h2 className="text-2xl font-bold text-white">{exercise.name}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#FACC15] px-2.5 py-0.5 text-[11px] font-bold text-black">
                {exercise.category ?? exercise.muscle}
              </span>
              <span
                className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${getUserDifficultyStyles(exercise.difficulty)}`}
              >
                {exercise.difficulty}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Sets", value: exercise.sets ?? "3" },
              { label: "Reps", value: exercise.reps ?? "8-12" },
              { label: "Rest", value: exercise.rest ?? "60s" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-zinc-800/80 bg-[#131315] px-3 py-3 text-center"
              >
                <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                  {stat.label}
                </p>
                <p className="mt-1 text-lg font-bold text-[#FACC15]">{stat.value}</p>
              </div>
            ))}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Target Muscles
            </p>
            <p className="mt-1 text-sm text-white">
              {exercise.targetMuscles ?? exercise.muscle}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Form Tips
            </p>
            <p className="mt-1 text-sm leading-relaxed text-zinc-300">
              {exercise.formTips ?? "Follow your coach's cues and move with control."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

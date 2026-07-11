"use client";

import { ImageIcon, Play, X } from "lucide-react";
import type { GymExercise } from "@/stores/owner-exercises-store";

interface ExerciseMediaModalProps {
  exercise: GymExercise | null;
  onClose: () => void;
}

export function ExerciseMediaModal({ exercise, onClose }: ExerciseMediaModalProps) {
  if (!exercise?.mediaUrl || !exercise.mediaType) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close preview"
      />
      <div className="relative z-10 w-full max-w-2xl rounded-2xl border border-white/10 bg-[#141414] p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-white">{exercise.name}</h3>
            <p className="text-sm text-zinc-400">{exercise.mediaName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 transition hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {exercise.mediaType === "video" ? (
          <video
            src={exercise.mediaUrl}
            controls
            playsInline
            className="max-h-[70vh] w-full rounded-xl bg-black object-contain"
          >
            Your browser does not support video playback.
          </video>
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={exercise.mediaUrl}
            alt={exercise.name}
            className="max-h-[70vh] w-full rounded-xl object-contain"
          />
        )}
      </div>
    </div>
  );
}

export function ExerciseMediaButton({
  exercise,
  onView,
}: {
  exercise: GymExercise;
  onView: () => void;
}) {
  if (!exercise.mediaUrl) {
    return <span className="text-xs text-zinc-600">—</span>;
  }

  return (
    <button
      type="button"
      onClick={onView}
      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1 text-xs text-zinc-300 transition hover:border-[#FFD700]/40 hover:text-[#FFD700]"
    >
      {exercise.mediaType === "video" ? (
        <Play className="h-3.5 w-3.5" />
      ) : (
        <ImageIcon className="h-3.5 w-3.5" />
      )}
      View
    </button>
  );
}

"use client";

import { useState } from "react";
import { Trash2, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getDifficultyStyles,
  type ExerciseMediaType,
  type GymExercise,
  useOwnerExercisesStore,
} from "@/stores/owner-exercises-store";
import {
  ExerciseMediaButton,
  ExerciseMediaModal,
} from "./ExerciseMediaModal";

const MAX_MEDIA_BYTES = 20 * 1024 * 1024;

interface ExerciseFormState {
  name: string;
  muscle: string;
  difficulty: string;
  mediaUrl: string | null;
  mediaType: ExerciseMediaType | null;
  mediaName: string | null;
}

const EMPTY_FORM: ExerciseFormState = {
  name: "",
  muscle: "",
  difficulty: "",
  mediaUrl: null,
  mediaType: null,
  mediaName: null,
};

export function ExercisesPanel() {
  const exercises = useOwnerExercisesStore((state) => state.exercises);
  const addExercise = useOwnerExercisesStore((state) => state.addExercise);
  const removeExercise = useOwnerExercisesStore((state) => state.removeExercise);

  const [form, setForm] = useState<ExerciseFormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [previewExercise, setPreviewExercise] = useState<GymExercise | null>(null);

  function resetForm() {
    setForm(EMPTY_FORM);
    setError(null);
  }

  function handleMediaUpload(file: File | undefined) {
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) {
      setError("Please upload a photo or video file.");
      return;
    }
    if (file.size > MAX_MEDIA_BYTES) {
      setError("File is too large. Please use a file under 20 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") return;
      setForm((prev) => ({
        ...prev,
        mediaUrl: result,
        mediaType: isVideo ? "video" : "image",
        mediaName: file.name,
      }));
      setError(null);
    };
    reader.onerror = () => setError("Failed to read the file. Try again.");
    reader.readAsDataURL(file);
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.muscle.trim() || !form.difficulty.trim()) {
      setError("Please fill in exercise name, muscle, and difficulty.");
      return;
    }

    addExercise({
      name: form.name,
      muscle: form.muscle,
      category: form.muscle,
      difficulty: form.difficulty,
      sets: "3",
      reps: "8-12",
      rest: "60s",
      targetMuscles: form.muscle,
      formTips: "Follow your coach's cues and move with control.",
      mediaUrl: form.mediaUrl,
      mediaType: form.mediaType,
      mediaName: form.mediaName,
      cardImageUrl:
        form.mediaType === "image" && form.mediaUrl
          ? form.mediaUrl
          : "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80",
    });
    resetForm();
  }

  return (
    <>
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section className="rounded-2xl border border-white/10 bg-[#141414] p-5">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs text-zinc-500">
                  <th className="pb-3 pr-4 font-medium">Name</th>
                  <th className="pb-3 pr-4 font-medium">Muscle</th>
                  <th className="pb-3 pr-4 font-medium">Difficulty</th>
                  <th className="pb-3 pr-4 font-medium">Media</th>
                  <th className="pb-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {exercises.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-zinc-500">
                      No exercises yet. Add your first exercise on the right.
                    </td>
                  </tr>
                ) : (
                  exercises.map((exercise) => (
                    <tr key={exercise.id} className="border-b border-white/5 last:border-0">
                      <td className="py-4 pr-4 font-medium text-white">{exercise.name}</td>
                      <td className="py-4 pr-4 text-zinc-400">{exercise.muscle}</td>
                      <td className="py-4 pr-4">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${getDifficultyStyles(exercise.difficulty)}`}
                        >
                          {exercise.difficulty}
                        </span>
                      </td>
                      <td className="py-4 pr-4">
                        <ExerciseMediaButton
                          exercise={exercise}
                          onView={() => setPreviewExercise(exercise)}
                        />
                      </td>
                      <td className="py-4 text-right">
                        <button
                          type="button"
                          onClick={() => removeExercise(exercise.id)}
                          className="rounded-lg border border-white/10 p-2 text-zinc-400 transition hover:bg-red-500/10 hover:text-red-400"
                          aria-label={`Delete ${exercise.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#141414] p-5">
          <h2 className="mb-5 text-lg font-semibold text-white">Add Exercise</h2>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="exerciseName">Exercise Name</Label>
              <Input
                id="exerciseName"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Barbell Squat"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetMuscle">Target Muscle</Label>
              <Input
                id="targetMuscle"
                value={form.muscle}
                onChange={(e) => setForm((prev) => ({ ...prev, muscle: e.target.value }))}
                placeholder="e.g. Legs"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="difficulty">Difficulty</Label>
              <Input
                id="difficulty"
                value={form.difficulty}
                onChange={(e) => setForm((prev) => ({ ...prev, difficulty: e.target.value }))}
                placeholder="e.g. Intermediate"
              />
            </div>

            <div className="space-y-2">
              <Label>Exercise Media (Photo/Video)</Label>
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-[#0A0A0A] px-4 py-8 text-sm text-zinc-400 transition hover:border-[#FFD700]/40 hover:text-zinc-200">
                <Upload className="h-5 w-5" />
                {form.mediaName ? form.mediaName : "Upload Photo or Video"}
                <input
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(e) => handleMediaUpload(e.target.files?.[0])}
                />
              </label>
              {form.mediaUrl ? (
                <div className="overflow-hidden rounded-xl border border-white/10 bg-black">
                  {form.mediaType === "video" ? (
                    <video
                      src={form.mediaUrl}
                      controls
                      playsInline
                      className="max-h-48 w-full object-contain"
                    />
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={form.mediaUrl}
                      alt="Exercise preview"
                      className="max-h-48 w-full object-contain"
                    />
                  )}
                </div>
              ) : null}
            </div>

            {error ? <p className="text-sm text-red-400">{error}</p> : null}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-[#FFD700]/50 px-4 py-2 text-sm font-medium text-[#FFD700] transition hover:bg-[#FFD700]/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-[#FFD700] px-4 py-2 text-sm font-bold text-black transition hover:bg-[#e6c200]"
              >
                Add
              </button>
            </div>
          </form>
        </section>
      </div>

      <ExerciseMediaModal
        exercise={previewExercise}
        onClose={() => setPreviewExercise(null)}
      />
    </>
  );
}

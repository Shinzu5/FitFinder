"use client";

import { useEffect, useState } from "react";
import { Pencil, Trash2, Upload, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resolveMediaUrl, uploadImageFile } from "@/lib/media";
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

const MAX_MEDIA_BYTES = 10 * 1024 * 1024;

interface ExerciseFormState {
  name: string;
  muscle: string;
  difficulty: string;
  mediaUrl: string | null;
  mediaType: ExerciseMediaType | null;
  mediaName: string | null;
  mediaPreview: string | null;
}

const EMPTY_FORM: ExerciseFormState = {
  name: "",
  muscle: "",
  difficulty: "",
  mediaUrl: null,
  mediaType: null,
  mediaName: null,
  mediaPreview: null,
};

export function ExercisesPanel() {
  const exercises = useOwnerExercisesStore((state) => state.exercises);
  const loading = useOwnerExercisesStore((state) => state.loading);
  const fetchExercises = useOwnerExercisesStore((state) => state.fetchExercises);
  const addExercise = useOwnerExercisesStore((state) => state.addExercise);
  const updateExercise = useOwnerExercisesStore((state) => state.updateExercise);
  const removeExercise = useOwnerExercisesStore((state) => state.removeExercise);

  const [form, setForm] = useState<ExerciseFormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewExercise, setPreviewExercise] = useState<GymExercise | null>(null);

  useEffect(() => {
    void fetchExercises();
  }, [fetchExercises]);

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setError(null);
  }

  function startEdit(exercise: GymExercise) {
    setEditingId(exercise.id);
    setForm({
      name: exercise.name,
      muscle: exercise.muscle,
      difficulty: exercise.difficulty,
      mediaUrl: exercise.mediaUrl,
      mediaType: exercise.mediaType,
      mediaName: exercise.mediaName,
      mediaPreview: exercise.mediaUrl ? resolveMediaUrl(exercise.mediaUrl) : null,
    });
    setError(null);
  }

  async function handleMediaUpload(file: File | undefined) {
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type === "video/mp4" || file.type.startsWith("video/");
    if (!isImage && !isVideo) {
      setError("Please upload a photo or MP4 video.");
      return;
    }
    if (file.size > MAX_MEDIA_BYTES) {
      setError("File is too large. Please use a file under 10 MB.");
      return;
    }

    setUploading(true);
    setError(null);
    const uploaded = await uploadImageFile(file);
    setUploading(false);

    if (!uploaded) {
      setError("Upload failed. Try another file.");
      return;
    }

    setForm((prev) => ({
      ...prev,
      mediaUrl: uploaded.url,
      mediaType: isVideo ? "video" : "image",
      mediaName: uploaded.filename,
      mediaPreview: resolveMediaUrl(uploaded.url),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.muscle.trim() || !form.difficulty.trim()) {
      setError("Please fill in exercise name, muscle, and difficulty.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      muscle: form.muscle.trim(),
      category: form.muscle.trim(),
      difficulty: form.difficulty.trim(),
      sets: "3",
      reps: "8-12",
      rest: "60s",
      targetMuscles: form.muscle.trim(),
      formTips: "Follow your coach's cues and move with control.",
      mediaUrl: form.mediaUrl,
      mediaType: form.mediaType,
      mediaName: form.mediaName,
      cardImageUrl:
        form.mediaType === "image" && form.mediaUrl
          ? form.mediaUrl
          : "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80",
    };

    if (editingId) {
      await updateExercise(editingId, payload);
    } else {
      await addExercise(payload);
    }
    resetForm();
  }

  return (
    <>
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section className="rounded-2xl border border-white/10 bg-[#141414] p-5">
          <div className="overflow-x-auto">
            <table className="w-full min-w-130 text-left text-sm">
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
                {loading && exercises.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-zinc-500">
                      Loading exercises…
                    </td>
                  </tr>
                ) : exercises.length === 0 ? (
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
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(exercise)}
                            className="rounded-lg border border-white/10 p-2 text-zinc-400 transition hover:bg-white/5 hover:text-white"
                            aria-label={`Edit ${exercise.name}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void removeExercise(exercise.id)}
                            className="rounded-lg border border-white/10 p-2 text-zinc-400 transition hover:bg-red-500/10 hover:text-red-400"
                            aria-label={`Delete ${exercise.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#141414] p-5">
          <h2 className="mb-5 text-lg font-semibold text-white">
            {editingId ? "Edit Exercise" : "Add Exercise"}
          </h2>
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
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
                {uploading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Upload className="h-5 w-5" />
                )}
                {uploading
                  ? "Uploading…"
                  : form.mediaName
                    ? form.mediaName
                    : "Upload Photo or Video"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,video/mp4"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => void handleMediaUpload(e.target.files?.[0])}
                />
              </label>
              {form.mediaPreview ? (
                <div className="overflow-hidden rounded-xl border border-white/10 bg-black">
                  {form.mediaType === "video" ? (
                    <video
                      src={form.mediaPreview}
                      controls
                      playsInline
                      className="max-h-48 w-full object-contain"
                    />
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={form.mediaPreview}
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
                disabled={uploading}
                className="rounded-lg bg-[#FFD700] px-4 py-2 text-sm font-bold text-black transition hover:bg-[#e6c200] disabled:opacity-50"
              >
                {editingId ? "Save" : "Add"}
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

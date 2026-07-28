"use client";

import { useState } from "react";
import { Banknote, Trash2, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  EMPTY_SCHEDULE,
  WEEK_DAYS,
  formatSessionPrice,
  getCoachInitials,
  type CoachSchedule,
  type GymCoach,
  type WeekDayKey,
  useOwnerCoachesStore,
} from "@/stores/owner-coaches-store";

interface CoachFormState {
  name: string;
  specialty: string;
  sessionPrice: string;
  schedule: CoachSchedule;
  description: string;
  photoUrl: string | null;
  photoName: string | null;
}

const EMPTY_FORM: CoachFormState = {
  name: "",
  specialty: "",
  sessionPrice: "",
  schedule: { ...EMPTY_SCHEDULE },
  description: "",
  photoUrl: null,
  photoName: null,
};

function CoachCard({
  coach,
  onDelete,
}: {
  coach: GymCoach;
  onDelete: () => void;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-[#141414] p-5">
      <div className="flex gap-4">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border border-white/10 bg-[#0A0A0A]">
          {coach.photoUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={coach.photoUrl} alt={coach.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[#FFD700]/20 text-lg font-semibold text-[#FFD700]">
              {getCoachInitials(coach.name)}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-white">{coach.name}</h3>
              <p className="text-sm font-medium text-[#FFD700]">{coach.specialty}</p>
            </div>
            <button
              type="button"
              onClick={onDelete}
              className="rounded-lg border border-white/10 p-2 text-red-400 transition hover:bg-red-500/10"
              aria-label={`Delete ${coach.name}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          <p className="mt-3 text-sm leading-relaxed text-zinc-400">{coach.description}</p>

          <p className="mt-3 flex items-center gap-2 text-sm text-zinc-300">
            <Banknote className="h-4 w-4 text-[#FFD700]" />
            {formatSessionPrice(coach.sessionPrice)}
          </p>

          <div className="mt-4 border-t border-white/10 pt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
              Schedule
            </p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-zinc-400 sm:grid-cols-3 lg:grid-cols-4">
              {WEEK_DAYS.map((day) => (
                <p key={day.key}>
                  <span className="text-zinc-500">{day.short}</span>{" "}
                  {coach.schedule[day.key] || "Off"}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export function CoachesPanel() {
  const coaches = useOwnerCoachesStore((state) => state.coaches);
  const addCoach = useOwnerCoachesStore((state) => state.addCoach);
  const removeCoach = useOwnerCoachesStore((state) => state.removeCoach);

  const [form, setForm] = useState<CoachFormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setForm(EMPTY_FORM);
    setError(null);
  }

  function updateSchedule(day: WeekDayKey, value: string) {
    setForm((prev) => ({
      ...prev,
      schedule: { ...prev.schedule, [day]: value },
    }));
  }

  function handlePhotoUpload(file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) {
      setError("Please upload an image file for the coach photo.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") return;
      setForm((prev) => ({
        ...prev,
        photoUrl: result,
        photoName: file.name,
      }));
      setError(null);
    };
    reader.readAsDataURL(file);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const price = Number(form.sessionPrice);

    if (!form.name.trim() || !form.specialty.trim() || !form.description.trim()) {
      setError("Please fill in coach name, specialty, and description.");
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      setError("Please enter a valid session price.");
      return;
    }

    addCoach({
      name: form.name,
      specialty: form.specialty,
      sessionPrice: price,
      schedule: form.schedule,
      description: form.description,
      photoUrl: form.photoUrl,
      photoName: form.photoName,
    });
    resetForm();
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/10 bg-[#141414] p-6">
        <h2 className="text-lg font-semibold text-white">Coaches</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Add coaches with their specialty, price, and available time.
        </p>

        <form onSubmit={handleSave} className="mt-6 space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="coachName">Coach Name</Label>
              <Input
                id="coachName"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="specialty">Specialty</Label>
              <Input
                id="specialty"
                value={form.specialty}
                onChange={(e) => setForm((prev) => ({ ...prev, specialty: e.target.value }))}
                placeholder="e.g. Powerlifting"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sessionPrice">Session Price</Label>
              <Input
                id="sessionPrice"
                type="number"
                min={1}
                value={form.sessionPrice}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, sessionPrice: e.target.value }))
                }
                placeholder="1500"
              />
            </div>
          </div>

          <div>
            <Label className="mb-3 block">Weekly Schedule</Label>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {WEEK_DAYS.map((day) => (
                <div key={day.key} className="space-y-2">
                  <Label htmlFor={day.key} className="text-xs text-zinc-500">
                    {day.label}
                  </Label>
                  <Input
                    id={day.key}
                    value={form.schedule[day.key]}
                    onChange={(e) => updateSchedule(day.key, e.target.value)}
                    placeholder="e.g. 8AM - 5PM or Off"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Coach Photo</Label>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-white/20 bg-[#0A0A0A] px-4 py-3 text-sm text-zinc-400 transition hover:border-[#FFD700]/40 hover:text-zinc-200">
              <Upload className="h-4 w-4" />
              {form.photoName ? form.photoName : "Upload Photo"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handlePhotoUpload(e.target.files?.[0])}
              />
            </label>
            {form.photoUrl ? (
              <div className="h-20 w-20 overflow-hidden rounded-full border border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={form.photoUrl}
                  alt="Coach preview"
                  className="h-full w-full object-cover"
                />
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="coachDescription">Description</Label>
            <textarea
              id="coachDescription"
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              rows={4}
              placeholder="Brief background and coaching style..."
              className="flex w-full rounded-lg border border-white/10 bg-[#0A0A0A] px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 outline-none transition focus:border-[#FFD700]/50 focus:ring-1 focus:ring-[#FFD700]/30"
            />
          </div>

          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-[#FFD700]/50 px-4 py-2 text-sm font-medium text-[#FFD700] transition hover:bg-[#FFD700]/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[#FFD700] px-5 py-2 text-sm font-bold text-black transition hover:bg-[#e6c200]"
            >
              Save Coach
            </button>
          </div>
        </form>
      </section>

      <div className="space-y-4">
        {coaches.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-zinc-500">
            No coaches yet. Save your first coach using the form above.
          </p>
        ) : (
          coaches.map((coach) => (
            <CoachCard key={coach.id} coach={coach} onDelete={() => removeCoach(coach.id)} />
          ))
        )}
      </div>
    </div>
  );
}

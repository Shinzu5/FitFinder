"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Eye, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DEFAULT_GYM_COVER_IMAGE,
  type RegisteredGym,
  useCreateGymStore,
} from "@/stores/create-gym-store";
import { useAuthStore } from "@/stores/auth-store";
import { DeleteGymModal } from "./DeleteGymModal";
import { GymPreviewModal } from "./GymPreviewModal";

function normalizeGym(gym: RegisteredGym): RegisteredGym {
  return {
    ...gym,
    coverImageUrl: gym.coverImageUrl ?? DEFAULT_GYM_COVER_IMAGE,
    membershipPrice: gym.membershipPrice ?? 799,
    schedule: gym.schedule ?? "Mon-Sun: 6AM - 10PM",
    memberCount: gym.memberCount ?? 142,
  };
}

export function MyGymPanel() {
  const router = useRouter();
  const registeredGym = useCreateGymStore((state) => state.registeredGym);
  const updateGymProfile = useCreateGymStore((state) => state.updateGymProfile);
  const deleteGym = useCreateGymStore((state) => state.deleteGym);
  const demoteToUser = useAuthStore((state) => state.demoteToUser);

  const [form, setForm] = useState<RegisteredGym | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    if (registeredGym) {
      setForm(normalizeGym(registeredGym));
    }
  }, [registeredGym]);

  if (!form) return null;

  function updateField<K extends keyof RegisteredGym>(key: K, value: RegisteredGym[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function handleCoverUpload(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        updateField("coverImageUrl", reader.result);
        updateField("coverPhotoName", file.name);
      }
    };
    reader.readAsDataURL(file);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    if (!form.name.trim() || !form.address.trim() || !form.contactNumber.trim()) {
      setSavedMessage("Please fill in required gym details.");
      return;
    }

    updateGymProfile({
      name: form.name.trim(),
      address: form.address.trim(),
      contactNumber: form.contactNumber.trim(),
      description: form.description.trim(),
      websiteOrSlug: form.websiteOrSlug.trim(),
      coverPhotoName: form.coverPhotoName,
      coverImageUrl: form.coverImageUrl,
      membershipPrice: form.membershipPrice,
      schedule: form.schedule.trim(),
    });

    setSavedMessage("Changes saved successfully.");
    setTimeout(() => setSavedMessage(null), 3000);
  }

  function handleDeleteConfirm() {
    deleteGym();
    demoteToUser();
    setDeleteOpen(false);
    router.replace("/dashboard/user/create-gym");
  }

  const previewGym = form;

  return (
    <>
      <form onSubmit={handleSave} className="mx-auto max-w-4xl space-y-6">
        <section className="rounded-2xl border border-white/10 bg-[#141414] p-6">
          <h2 className="mb-6 text-lg font-semibold text-white">Gym Profile</h2>

          <div className="space-y-2">
            <Label>Cover Photo</Label>
            <div className="relative overflow-hidden rounded-xl border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={form.coverImageUrl}
                alt="Gym cover"
                className="h-48 w-full object-cover sm:h-56"
              />
              <label className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center bg-black/40 opacity-0 transition hover:opacity-100">
                <Upload className="h-6 w-6 text-white" />
                <span className="mt-2 text-sm text-white">Change photo</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleCoverUpload(e.target.files?.[0])}
                />
              </label>
            </div>
            <p className="text-xs text-zinc-500">
              This image will appear on your public gym page and in the home gym list.
            </p>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="gymName">Gym Name</Label>
              <Input
                id="gymName"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website Link or Slug</Label>
              <Input
                id="website"
                value={form.websiteOrSlug}
                onChange={(e) => updateField("websiteOrSlug", e.target.value)}
                placeholder="abbsy.gym"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Base Membership Price (₱)</Label>
              <Input
                id="price"
                type="number"
                min={0}
                value={form.membershipPrice}
                onChange={(e) =>
                  updateField("membershipPrice", Number(e.target.value) || 0)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="schedule">Open/Close Schedule</Label>
              <Input
                id="schedule"
                value={form.schedule}
                onChange={(e) => updateField("schedule", e.target.value)}
                placeholder="e.g. Mon-Sun: 6AM - 10PM"
              />
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <Label htmlFor="contact">Contact Information</Label>
            <Input
              id="contact"
              value={form.contactNumber}
              onChange={(e) => updateField("contactNumber", e.target.value)}
              placeholder="0917 123 4567"
            />
          </div>

          <div className="mt-4 space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              rows={4}
              placeholder="A community-focused mini gym with top-tier equipment."
              className="flex w-full rounded-lg border border-white/10 bg-[#0A0A0A] px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 outline-none transition focus:border-[#FFD700]/50 focus:ring-1 focus:ring-[#FFD700]/30"
            />
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-[#FFD700]/50 px-4 py-2.5 text-sm font-medium text-[#FFD700] transition hover:bg-[#FFD700]/10"
            >
              <Eye className="h-4 w-4" />
              Preview Public View
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[#FFD700] px-5 py-2.5 text-sm font-bold text-black transition hover:bg-[#e6c200]"
            >
              Save Changes
            </button>
          </div>

          {savedMessage ? (
            <p
              className={`mt-4 text-right text-sm ${
                savedMessage.includes("success") ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {savedMessage}
            </p>
          ) : null}
        </section>

        <section className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6">
          <div className="flex items-center gap-2 text-red-400">
            <AlertTriangle className="h-4 w-4" />
            <h3 className="font-semibold">Danger Zone</h3>
          </div>
          <p className="mt-2 text-sm text-zinc-400">
            Permanently delete this gym and all of its data. This action cannot be undone.
          </p>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="mt-4 rounded-lg border border-red-500/50 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-500/10"
          >
            Delete Gym
          </button>
        </section>
      </form>

      {previewOpen ? (
        <GymPreviewModal gym={previewGym} onClose={() => setPreviewOpen(false)} />
      ) : null}

      <DeleteGymModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}

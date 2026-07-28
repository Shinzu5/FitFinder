"use client";

import { useEffect, useState } from "react";
import { Upload, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/stores/auth-store";

interface ChangeProfilePictureModalProps {
  open: boolean;
  onClose: () => void;
}

export function ChangeProfilePictureModal({ open, onClose }: ChangeProfilePictureModalProps) {
  const user = useAuthStore((state) => state.user);
  const updateProfileAvatar = useAuthStore((state) => state.updateProfileAvatar);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPreviewUrl(user?.avatarUrl ?? null);
    setError(null);
  }, [open, user?.avatarUrl]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  function handlePhotoUpload(file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) {
      setError("Please upload an image file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") return;
      setPreviewUrl(result);
      setError(null);
    };
    reader.readAsDataURL(file);
  }

  function handleSave() {
    if (!previewUrl) {
      setError("Please upload a profile photo.");
      return;
    }
    updateProfileAvatar(previewUrl);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
        aria-label="Close change profile picture dialog"
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-[#141414] p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Change profile picture</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 p-2 text-zinc-400 hover:text-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex justify-center">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Profile preview"
                className="h-24 w-24 rounded-full object-cover ring-2 ring-[#FFD700]/40"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#FFD700]/20 text-sm text-zinc-400">
                No photo
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Upload Photo</Label>
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-[#0A0A0A] px-4 py-6 text-sm text-zinc-400 transition hover:border-[#FFD700]/40 hover:text-zinc-200">
              <Upload className="h-5 w-5" />
              Choose image
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handlePhotoUpload(e.target.files?.[0])}
              />
            </label>
          </div>

          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          <button
            type="button"
            onClick={handleSave}
            className="w-full rounded-lg bg-[#FFD700] px-4 py-2.5 text-sm font-bold text-black transition hover:bg-[#e6c200]"
          >
            Save Photo
          </button>
        </div>
      </div>
    </div>
  );
}

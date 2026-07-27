"use client";

import { AlertTriangle } from "lucide-react";

interface DeleteGymModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteGymModal({ open, onClose, onConfirm }: DeleteGymModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-red-500/30 bg-[#141414] p-6 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15 text-red-400">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold text-white">Delete this gym?</h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          Deleting this gym is non-refundable and permanent. All members, coaches, and
          equipment data will be lost.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#FFD700]/50 px-5 py-2.5 text-sm font-medium text-[#FFD700] transition hover:bg-[#FFD700]/10"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-red-500"
          >
            OK, Delete
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { AlertTriangle } from "lucide-react";

interface AdminRemoveUserModalProps {
  open: boolean;
  userName: string;
  roleLabel?: string;
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

export function AdminRemoveUserModal({
  open,
  userName,
  roleLabel,
  busy = false,
  error = null,
  onClose,
  onConfirm,
}: AdminRemoveUserModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={() => {
          if (!busy) onClose();
        }}
        aria-label="Close"
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-red-500/30 bg-[#141414] p-6 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15 text-red-400">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold text-white">Remove user?</h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          {roleLabel === "clerk"
            ? "This clerk account will be permanently deleted from the platform, including their gym assignment."
            : "Are you sure you want to remove this user?"}
        </p>
        <p className="mt-1 text-sm font-medium text-white">{userName}</p>
        {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg border border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-white/5 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-red-500 disabled:opacity-50"
          >
            {busy ? "Removing…" : "Remove"}
          </button>
        </div>
      </div>
    </div>
  );
}

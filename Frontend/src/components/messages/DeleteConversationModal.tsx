"use client";

import { AlertTriangle } from "lucide-react";

interface DeleteConversationModalProps {
  open: boolean;
  busy?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteConversationModal({
  open,
  busy = false,
  onClose,
  onConfirm,
}: DeleteConversationModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={() => {
          if (!busy) onClose();
        }}
        aria-label="Close"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-conversation-title"
        className="relative z-10 w-full max-w-md rounded-2xl border border-red-500/30 bg-[#141414] p-6 text-center shadow-2xl"
      >
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15 text-red-400">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 id="delete-conversation-title" className="text-xl font-bold text-white">
          Remove this conversation from your inbox?
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-300">
          It will be permanently deleted.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="min-w-25 rounded-lg border border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-white/5 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="min-w-25 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-red-500 disabled:opacity-50"
          >
            {busy ? "Deleting…" : "Yes"}
          </button>
        </div>
      </div>
    </div>
  );
}

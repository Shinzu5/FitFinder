"use client";

import { useEffect } from "react";
import { Sparkles, UserCircle2, X } from "lucide-react";
import {
  getContactInitials,
  type MessageContact,
} from "@/stores/owner-messages-store";

interface NewMessageModalProps {
  open: boolean;
  contacts: MessageContact[];
  onClose: () => void;
  onSelectContact: (contactId: string) => void;
}

export function NewMessageModal({
  open,
  contacts,
  onClose,
  onSelectContact,
}: NewMessageModalProps) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
        aria-label="Close new message dialog"
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-[#141414] p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">New Message</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 p-2 text-zinc-400 hover:text-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-4 text-sm text-zinc-400">Choose who you want to message.</p>
        <div className="max-h-80 space-y-2 overflow-y-auto">
          {contacts.map((contact) => (
            <button
              key={contact.id}
              type="button"
              onClick={() => {
                onSelectContact(contact.id);
                onClose();
              }}
              className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-[#0A0A0A] px-4 py-3 text-left transition hover:border-[#FFD700]/30 hover:bg-white/5"
            >
              {contact.type === "ai" ? (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FFD700]/15 text-[#FFD700]">
                  <Sparkles className="h-5 w-5" />
                </div>
              ) : contact.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={contact.avatarUrl}
                  alt={contact.name}
                  className="h-10 w-10 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FFD700]/20 text-sm font-semibold text-[#FFD700]">
                  {getContactInitials(contact.name)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-white">{contact.name}</p>
                  {contact.geminiTag ? (
                    <span className="rounded bg-[#FFD700]/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#FFD700]">
                      Gemini
                    </span>
                  ) : null}
                </div>
                <p className="truncate text-sm text-zinc-500">
                  {contact.subtitle ?? (contact.type === "member" ? "Gym member" : "Assistant")}
                </p>
              </div>
              <UserCircle2 className="h-4 w-4 shrink-0 text-zinc-600" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

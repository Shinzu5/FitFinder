"use client";

import { useEffect, useRef, useState } from "react";
import { Search, UserCircle2, X } from "lucide-react";
import {
  getContactInitials,
  useOwnerMessagesStore,
  type MessageContact,
} from "@/stores/owner-messages-store";

interface NewMessageModalProps {
  open: boolean;
  onClose: () => void;
  onSelectContact: (contact: MessageContact) => void;
}

export function NewMessageModal({ open, onClose, onSelectContact }: NewMessageModalProps) {
  const [query, setQuery] = useState("");
  const searchResults = useOwnerMessagesStore((state) => state.searchResults);
  const searching = useOwnerMessagesStore((state) => state.searching);
  const searchUsers = useOwnerMessagesStore((state) => state.searchUsers);
  const clearSearch = useOwnerMessagesStore((state) => state.clearSearch);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      clearSearch();
    }
  }, [open, clearSearch]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void searchUsers(query);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, searchUsers]);

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

        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search registered users by name or email..."
            className="w-full rounded-xl border border-white/10 bg-[#0A0A0A] py-2.5 pl-9 pr-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-[#FFD700]/50"
          />
        </div>

        <div className="max-h-80 space-y-2 overflow-y-auto">
          {query.trim() === "" ? (
            <p className="px-1 py-3 text-center text-sm text-zinc-500">
              Type a name or email to find a registered user to message.
            </p>
          ) : searching ? (
            <p className="px-1 py-3 text-center text-sm text-zinc-500">Searching...</p>
          ) : searchResults.length === 0 ? (
            <p className="px-1 py-3 text-center text-sm text-zinc-500">
              No registered users found for &quot;{query}&quot;.
            </p>
          ) : (
            searchResults.map((contact) => (
              <button
                key={contact.id}
                type="button"
                onClick={() => {
                  onSelectContact(contact);
                  onClose();
                }}
                className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-[#0A0A0A] px-4 py-3 text-left transition hover:border-[#FFD700]/30 hover:bg-white/5"
              >
                {contact.avatarUrl ? (
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
                  <p className="font-medium text-white">{contact.name}</p>
                  <p className="truncate text-sm text-zinc-500">{contact.subtitle}</p>
                </div>
                <UserCircle2 className="h-4 w-4 shrink-0 text-zinc-600" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

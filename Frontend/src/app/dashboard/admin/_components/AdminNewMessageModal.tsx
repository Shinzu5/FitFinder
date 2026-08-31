"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import {
  getContactInitials,
  useAdminMessagesStore,
} from "@/stores/admin-messages-store";

interface AdminNewMessageModalProps {
  open: boolean;
  onClose: () => void;
}

export function AdminNewMessageModal({ open, onClose }: AdminNewMessageModalProps) {
  const searchQuery = useAdminMessagesStore((state) => state.searchQuery);
  const searchResults = useAdminMessagesStore((state) => state.searchResults);
  const searching = useAdminMessagesStore((state) => state.searching);
  const searchUsers = useAdminMessagesStore((state) => state.searchUsers);
  const clearSearch = useAdminMessagesStore((state) => state.clearSearch);
  const openConversationWithUser = useAdminMessagesStore(
    (state) => state.openConversationWithUser,
  );

  useEffect(() => {
    if (!open) clearSearch();
  }, [open, clearSearch]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-zinc-800/70 bg-[#0e0e10] p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">New Message</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-white/5 hover:text-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <input
          value={searchQuery}
          onChange={(e) => void searchUsers(e.target.value)}
          placeholder="Search owners, clerks, or gymers..."
          autoFocus
          className="w-full rounded-xl border border-zinc-800/80 bg-[#131315] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-[#FACC15]/40"
        />

        <div className="mt-3 max-h-72 space-y-1 overflow-y-auto">
          {searching ? (
            <p className="px-2 py-6 text-center text-sm text-zinc-500">Searching…</p>
          ) : !searchQuery.trim() ? (
            <p className="px-2 py-6 text-center text-sm text-zinc-500">
              Type a name or email to find someone to message.
            </p>
          ) : searchResults.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-zinc-500">
              No registered users found for &quot;{searchQuery}&quot;.
            </p>
          ) : (
            searchResults.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => {
                  void openConversationWithUser({
                    id: user.id,
                    fullName: user.name,
                    role: user.role,
                    avatarUrl: user.avatarUrl,
                  }).then(onClose);
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/5"
              >
                {user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="h-9 w-9 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FACC15]/20 text-xs font-semibold text-[#FACC15]">
                    {getContactInitials(user.name)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{user.name}</p>
                  <p className="truncate text-xs text-zinc-500">{user.subtitle}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

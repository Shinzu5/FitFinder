"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Plus, Send, Trash2 } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { useMembershipStore } from "@/stores/membership-store";
import {
  getThreadPreview,
  type GymMessageThread,
  type UserChatMessage,
  type UserSearchContact,
  useUserMessagesStore,
} from "@/stores/user-messages-store";
import { DeleteConversationModal } from "@/components/messages/DeleteConversationModal";
import { UserNewMessageModal } from "./UserNewMessageModal";

function ThreadAvatar({ thread, size = "md" }: { thread: GymMessageThread; size?: "sm" | "md" }) {
  const dim = size === "sm" ? "h-10 w-10" : "h-11 w-11";
  const src = String(thread.gymImageUrl || "").trim();
  if (!src) {
    return (
      <div
        className={`${dim} flex shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold text-[#FFD700]`}
      >
        {(thread.gymName || "G").slice(0, 1).toUpperCase()}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={thread.gymName} className={`${dim} shrink-0 rounded-full object-cover`} />
  );
}

function OwnerAvatar({ thread }: { thread: GymMessageThread }) {
  const src = String(thread.ownerAvatarUrl || "").trim();
  if (!src) {
    return (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-bold text-[#FFD700]">
        {(thread.ownerName || "O").slice(0, 1).toUpperCase()}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={thread.ownerName}
      className="h-8 w-8 shrink-0 rounded-full object-cover"
    />
  );
}

function MessageBubble({
  message,
  thread,
}: {
  message: UserChatMessage;
  thread: GymMessageThread;
}) {
  const isMember = message.sender === "member";

  if (isMember) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%]">
          <div className="rounded-2xl rounded-br-md bg-[#FACC15] px-4 py-2.5 text-sm text-black">
            {message.text}
          </div>
          <p className="mt-1 text-right text-xs text-zinc-500">{message.time}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-end gap-2">
      <OwnerAvatar thread={thread} />
      <div className="max-w-[75%]">
        <div className="rounded-2xl rounded-bl-md border border-zinc-800/80 bg-[#1a1a1c] px-4 py-2.5 text-sm text-zinc-200">
          {message.text}
        </div>
        <p className="mt-1 text-xs text-zinc-500">{message.time}</p>
      </div>
    </div>
  );
}

export function UserMessagesPanel() {
  const authUser = useAuthStore((state) => state.user);
  const joinedGymId = useMembershipStore((state) => state.joinedGymId);
  const membership = useMembershipStore((state) => state.membership);
  const threads = useUserMessagesStore((state) => state.threads);
  const activeThreadId = useUserMessagesStore((state) => state.activeThreadId);
  const loadingThreads = useUserMessagesStore((state) => state.loadingThreads);
  const setCurrentUserId = useUserMessagesStore((state) => state.setCurrentUserId);
  const fetchThreads = useUserMessagesStore((state) => state.fetchThreads);
  const setActiveThread = useUserMessagesStore((state) => state.setActiveThread);
  const openThreadWithContact = useUserMessagesStore((state) => state.openThreadWithContact);
  const sendMessage = useUserMessagesStore((state) => state.sendMessage);
  const deleteConversation = useUserMessagesStore((state) => state.deleteConversation);
  const syncJoinedGym = useUserMessagesStore((state) => state.syncJoinedGym);

  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [newMessageOpen, setNewMessageOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (authUser?.id) {
      setCurrentUserId(authUser.id);
      void fetchThreads();
    }
  }, [authUser?.id, joinedGymId, setCurrentUserId, fetchThreads]);

  useEffect(() => {
    syncJoinedGym(joinedGymId, membership?.gymName ?? null);
  }, [joinedGymId, membership?.gymName, syncJoinedGym]);

  function handleSelectContact(contact: UserSearchContact) {
    void openThreadWithContact(contact);
  }

  const filteredThreads = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return threads;
    return threads.filter((thread) => {
      const preview = getThreadPreview(thread).toLowerCase();
      return (
        thread.gymName.toLowerCase().includes(query) ||
        thread.ownerName.toLowerCase().includes(query) ||
        preview.includes(query)
      );
    });
  }, [search, threads]);

  const activeThread = threads.find((thread) => thread.id === activeThreadId) ?? null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeThread?.messages.length, activeThreadId]);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!activeThread || !draft.trim()) return;
    sendMessage(activeThread.id, draft);
    setDraft("");
  }

  return (
    <>
    <div className="flex h-[calc(100vh-8.5rem)] min-h-[520px] overflow-hidden rounded-2xl border border-zinc-800/70 bg-[#0e0e10]">
      <aside className={`w-full max-w-full shrink-0 flex-col border-r border-zinc-800/70 bg-[#0b0b0d] md:w-80 md:max-w-xs ${activeThreadId ? "hidden md:flex" : "flex"}`}>
        <div className="border-b border-zinc-800/70 px-4 py-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-white">Messages</h2>
            <button
              type="button"
              onClick={() => setNewMessageOpen(true)}
              className="rounded-lg border border-zinc-800/80 p-2 text-zinc-300 transition hover:border-[#FACC15]/40 hover:text-[#FACC15]"
              aria-label="New message"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="mt-3 w-full rounded-xl border border-zinc-800/80 bg-[#131315] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-[#FACC15]/40"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loadingThreads ? (
            <p className="px-3 py-6 text-center text-sm text-zinc-500">Loading conversations...</p>
          ) : filteredThreads.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-zinc-500">
              No conversations yet. Tap + to message a registered user.
            </p>
          ) : (
            filteredThreads.map((thread) => {
              const active = thread.id === activeThreadId;
              return (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => setActiveThread(thread.id)}
                  className={`flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition ${
                    active
                      ? "border border-[#FACC15]/30 bg-[#FACC15]/10"
                      : "border border-transparent hover:bg-white/5"
                  }`}
                >
                  <div className="relative shrink-0">
                    <ThreadAvatar thread={thread} size="sm" />
                    {thread.isOnline ? (
                      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#0b0b0d] bg-emerald-400" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`truncate font-semibold ${active ? "text-[#FACC15]" : "text-white"}`}>
                      {thread.ownerName}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-zinc-500">
                      {getThreadPreview(thread)}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      <section className={`min-w-0 flex-1 flex-col bg-[#0a0a0b] ${activeThread ? "flex" : "hidden md:flex"}`}>
        {activeThread ? (
          <>
            <div className="flex items-center gap-3 border-b border-zinc-800/70 px-4 py-3 sm:px-5 sm:py-4">
              <button
                type="button"
                onClick={() => useUserMessagesStore.setState({ activeThreadId: "" })}
                className="rounded-lg border border-zinc-800 p-1.5 text-zinc-400 hover:text-white md:hidden"
                aria-label="Back to conversations"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="relative">
                <OwnerAvatar thread={activeThread} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-white">{activeThread.ownerName}</p>
                <p className="text-xs text-zinc-500">{activeThread.gymName}</p>
              </div>
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-semibold text-red-400 transition hover:bg-red-500/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Delete</span>
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
              {activeThread.messages.map((message) => (
                <MessageBubble key={message.id} message={message} thread={activeThread} />
              ))}
              <div ref={messagesEndRef} />
            </div>

            <form
              onSubmit={handleSend}
              className="flex items-center gap-3 border-t border-zinc-800/70 px-5 py-4"
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 rounded-xl border border-zinc-800/80 bg-[#131315] px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-[#FACC15]/40"
              />
              <button
                type="submit"
                disabled={!draft.trim()}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FACC15] text-black transition hover:bg-[#e6c200] disabled:opacity-40"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <p className="text-sm text-zinc-500">Select a conversation to start messaging.</p>
            <button
              type="button"
              onClick={() => setNewMessageOpen(true)}
              className="rounded-lg bg-[#FACC15] px-4 py-2 text-sm font-semibold text-black hover:bg-[#e6c200]"
            >
              New Message
            </button>
          </div>
        )}
      </section>
    </div>

    <UserNewMessageModal
      open={newMessageOpen}
      onClose={() => setNewMessageOpen(false)}
      onSelectContact={handleSelectContact}
    />
    <DeleteConversationModal
      open={deleteOpen}
      busy={deleteBusy}
      onClose={() => {
        if (!deleteBusy) setDeleteOpen(false);
      }}
      onConfirm={() => {
        if (!activeThread) {
          setDeleteOpen(false);
          return;
        }
        setDeleteBusy(true);
        void deleteConversation(activeThread.id).finally(() => {
          setDeleteBusy(false);
          setDeleteOpen(false);
        });
      }}
    />
    </>
  );
}

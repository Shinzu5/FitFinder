"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Plus, Send, Trash2 } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import {
  getOwnerThreadPreview,
  type AdminSupportMessage,
  type OwnerSupportThread,
  useAdminMessagesStore,
} from "@/stores/admin-messages-store";
import { DeleteConversationModal } from "@/components/messages/DeleteConversationModal";
import { AdminNewMessageModal } from "./AdminNewMessageModal";

function OwnerAvatar({
  thread,
  size = "md",
}: {
  thread: OwnerSupportThread;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "h-10 w-10" : "h-11 w-11";
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={thread.ownerAvatarUrl}
      alt={thread.ownerName}
      className={`${dim} shrink-0 rounded-full object-cover`}
    />
  );
}

function MessageBubble({
  message,
  thread,
}: {
  message: AdminSupportMessage;
  thread: OwnerSupportThread;
}) {
  const isAdmin = message.sender === "admin";

  if (isAdmin) {
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
      <OwnerAvatar thread={thread} size="sm" />
      <div className="max-w-[75%]">
        <div className="rounded-2xl rounded-bl-md border border-zinc-800/80 bg-[#1a1a1c] px-4 py-2.5 text-sm text-zinc-200">
          {message.text}
        </div>
        <p className="mt-1 text-xs text-zinc-500">{message.time}</p>
      </div>
    </div>
  );
}

export function AdminMessagesPanel() {
  const user = useAuthStore((state) => state.user);
  const threads = useAdminMessagesStore((state) => state.threads);
  const activeThreadId = useAdminMessagesStore((state) => state.activeThreadId);
  const loading = useAdminMessagesStore((state) => state.loading);
  const setCurrentUserId = useAdminMessagesStore((state) => state.setCurrentUserId);
  const fetchConversations = useAdminMessagesStore((state) => state.fetchConversations);
  const setActiveThread = useAdminMessagesStore((state) => state.setActiveThread);
  const sendReply = useAdminMessagesStore((state) => state.sendReply);
  const deleteConversation = useAdminMessagesStore((state) => state.deleteConversation);

  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user?.id) setCurrentUserId(user.id);
  }, [user?.id, setCurrentUserId]);

  useEffect(() => {
    void fetchConversations();
  }, [fetchConversations]);

  const filteredThreads = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return threads;
    return threads.filter((thread) => {
      const preview = getOwnerThreadPreview(thread).toLowerCase();
      return (
        thread.ownerName.toLowerCase().includes(query) ||
        thread.gymName.toLowerCase().includes(query) ||
        thread.roleLabel.toLowerCase().includes(query) ||
        preview.includes(query)
      );
    });
  }, [search, threads]);

  const activeThread =
    threads.find((thread) => thread.id === activeThreadId) ?? null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeThread?.messages.length, activeThreadId]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!activeThread || !draft.trim()) return;
    const text = draft;
    setDraft("");
    await sendReply(activeThread.id, text);
  }

  return (
    <>
      <div className="mx-auto flex h-[calc(100vh-8.5rem)] min-h-[520px] max-w-6xl overflow-hidden rounded-2xl border border-zinc-800/70 bg-[#0e0e10]">
        <aside className={`w-full max-w-full shrink-0 flex-col border-r border-zinc-800/70 bg-[#0b0b0d] md:w-80 md:max-w-xs ${activeThreadId ? "hidden md:flex" : "flex"}`}>
          <div className="border-b border-zinc-800/70 px-4 py-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-bold text-white">Messages</h2>
              <button
                type="button"
                onClick={() => setNewOpen(true)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#FACC15]/40 text-[#FACC15] transition hover:bg-[#FACC15]/10"
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
            {loading && threads.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-zinc-500">Loading…</p>
            ) : filteredThreads.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-zinc-500">
                No conversations yet. Tap + to message someone.
              </p>
            ) : (
              filteredThreads.map((thread) => {
                const active = thread.id === activeThreadId;
                return (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => void setActiveThread(thread.id)}
                    className={`flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition ${
                      active
                        ? "border border-[#FACC15]/30 bg-[#FACC15]/10"
                        : "border border-transparent hover:bg-white/5"
                    }`}
                  >
                    <div className="relative shrink-0">
                      <OwnerAvatar thread={thread} size="sm" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p
                          className={`truncate font-semibold ${active ? "text-[#FACC15]" : "text-white"}`}
                        >
                          {thread.ownerName}
                        </p>
                        {thread.unreadCount > 0 ? (
                          <span className="shrink-0 rounded-full bg-[#FACC15] px-1.5 py-0.5 text-[10px] font-bold text-black">
                            {thread.unreadCount}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-zinc-500">
                        {getOwnerThreadPreview(thread)}
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
                  onClick={() => useAdminMessagesStore.setState({ activeThreadId: "" })}
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
                  <p className="text-xs text-zinc-500">
                    {activeThread.gymName || activeThread.roleLabel}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-semibold text-red-400 transition hover:bg-red-500/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                {activeThread.messages.length === 0 ? (
                  <p className="py-12 text-center text-sm text-zinc-500">
                    No messages yet. Say hello.
                  </p>
                ) : (
                  activeThread.messages.map((message) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      thread={activeThread}
                    />
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              <form
                onSubmit={(e) => void handleSend(e)}
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
                  aria-label="Send reply"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">
              Select a conversation or start a new message.
            </div>
          )}
        </section>
      </div>

      <AdminNewMessageModal open={newOpen} onClose={() => setNewOpen(false)} />
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

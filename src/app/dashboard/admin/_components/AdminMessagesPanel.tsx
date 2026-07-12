"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Send } from "lucide-react";
import {
  getOwnerThreadPreview,
  type AdminSupportMessage,
  type OwnerSupportThread,
  useAdminMessagesStore,
} from "@/stores/admin-messages-store";

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
  const threads = useAdminMessagesStore((state) => state.threads);
  const activeThreadId = useAdminMessagesStore((state) => state.activeThreadId);
  const setActiveThread = useAdminMessagesStore((state) => state.setActiveThread);
  const sendReply = useAdminMessagesStore((state) => state.sendReply);

  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const filteredThreads = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return threads;
    return threads.filter((thread) => {
      const preview = getOwnerThreadPreview(thread).toLowerCase();
      return (
        thread.ownerName.toLowerCase().includes(query) ||
        thread.gymName.toLowerCase().includes(query) ||
        preview.includes(query)
      );
    });
  }, [search, threads]);

  const activeThread =
    threads.find((thread) => thread.id === activeThreadId) ?? threads[0];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeThread?.messages.length, activeThreadId]);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!activeThread || !draft.trim()) return;
    sendReply(activeThread.id, draft);
    setDraft("");
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-8.5rem)] min-h-[520px] max-w-6xl overflow-hidden rounded-2xl border border-zinc-800/70 bg-[#0e0e10]">
      <aside className="flex w-full max-w-xs shrink-0 flex-col border-r border-zinc-800/70 bg-[#0b0b0d]">
        <div className="border-b border-zinc-800/70 px-4 py-4">
          <h2 className="font-bold text-white">Owner Support</h2>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search owners..."
            className="mt-3 w-full rounded-xl border border-zinc-800/80 bg-[#131315] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-[#FACC15]/40"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {filteredThreads.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-zinc-500">No owners found.</p>
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
                    <OwnerAvatar thread={thread} size="sm" />
                    {thread.isOnline ? (
                      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#0b0b0d] bg-emerald-400" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate font-semibold ${active ? "text-[#FACC15]" : "text-white"}`}
                    >
                      {thread.ownerName}
                    </p>
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

      <section className="flex min-w-0 flex-1 flex-col bg-[#0a0a0b]">
        {activeThread ? (
          <>
            <div className="flex items-center gap-3 border-b border-zinc-800/70 px-5 py-4">
              <div className="relative">
                <OwnerAvatar thread={activeThread} />
                {activeThread.isOnline ? (
                  <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full border border-[#0a0a0b] bg-emerald-400" />
                ) : null}
              </div>
              <div>
                <p className="font-semibold text-white">{activeThread.ownerName}</p>
                <p className="text-xs text-zinc-500">{activeThread.gymName}</p>
              </div>
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
                placeholder="Reply to owner..."
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
            Select an owner conversation to start messaging.
          </div>
        )}
      </section>
    </div>
  );
}

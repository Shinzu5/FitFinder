"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Send, Sparkles } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import {
  getContactInitials,
  getConversationPreview,
  type ChatMessage,
  type MessageContact,
  useClerkMessagesStore,
} from "@/stores/clerk-messages-store";
import { ClerkNewMessageModal } from "./ClerkNewMessageModal";

function ContactAvatar({ contact, size = "md" }: { contact: MessageContact; size?: "sm" | "md" }) {
  const dim = size === "sm" ? "h-9 w-9" : "h-10 w-10";

  if (contact.type === "ai") {
    return (
      <div
        className={`flex ${dim} shrink-0 items-center justify-center rounded-full bg-[#FACC15]/15 text-[#FACC15]`}
      >
        <Sparkles className={size === "sm" ? "h-4 w-4" : "h-5 w-5"} />
      </div>
    );
  }

  if (contact.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={contact.avatarUrl}
        alt={contact.name}
        className={`${dim} shrink-0 rounded-full object-cover`}
      />
    );
  }

  return (
    <div
      className={`flex ${dim} shrink-0 items-center justify-center rounded-full bg-[#FACC15]/20 text-sm font-semibold text-[#FACC15]`}
    >
      {getContactInitials(contact.name)}
    </div>
  );
}

function ConversationListItem({
  contact,
  preview,
  active,
  onClick,
}: {
  contact: MessageContact;
  preview: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition ${
        active ? "bg-[#FACC15]/10" : "hover:bg-white/5"
      }`}
    >
      <div className="relative shrink-0">
        <ContactAvatar contact={contact} size="sm" />
        {contact.isOnline ? (
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#141414] bg-emerald-400" />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className={`truncate font-medium ${active ? "text-[#FACC15]" : "text-white"}`}>
            {contact.name}
          </p>
          {contact.geminiTag ? (
            <span className="shrink-0 rounded bg-[#FACC15]/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#FACC15]">
              Gemini
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 truncate text-xs text-zinc-500">{contact.subtitle ?? preview}</p>
      </div>
    </button>
  );
}

function MessageBubble({
  message,
  contact,
}: {
  message: ChatMessage;
  contact: MessageContact;
}) {
  const isMine = message.sender === "me";

  if (isMine) {
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
      <ContactAvatar contact={contact} size="sm" />
      <div className="max-w-[75%]">
        <div className="rounded-2xl rounded-bl-md border border-white/10 bg-[#1E1E1E] px-4 py-2.5 text-sm text-zinc-200">
          {message.text}
        </div>
        <p className="mt-1 text-xs text-zinc-500">{message.time}</p>
      </div>
    </div>
  );
}

export function ClerkMessagesPanel() {
  const authUser = useAuthStore((state) => state.user);
  const contacts = useClerkMessagesStore((state) => state.contacts);
  const conversations = useClerkMessagesStore((state) => state.conversations);
  const activeConversationId = useClerkMessagesStore((state) => state.activeConversationId);
  const loadingConversations = useClerkMessagesStore((state) => state.loadingConversations);
  const setCurrentUserId = useClerkMessagesStore((state) => state.setCurrentUserId);
  const fetchConversations = useClerkMessagesStore((state) => state.fetchConversations);
  const openConversationWithContact = useClerkMessagesStore(
    (state) => state.openConversationWithContact,
  );
  const sendMessage = useClerkMessagesStore((state) => state.sendMessage);

  const [draft, setDraft] = useState("");
  const [newMessageOpen, setNewMessageOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (authUser?.id) {
      setCurrentUserId(authUser.id);
      void fetchConversations();
    }
  }, [authUser?.id, setCurrentUserId, fetchConversations]);

  const allContacts = useMemo(() => {
    const seen = new Set<string>();
    return contacts.filter((contact) => {
      if (seen.has(contact.id)) return false;
      seen.add(contact.id);
      return true;
    });
  }, [contacts]);

  const contactMap = useMemo(
    () => new Map(allContacts.map((contact) => [contact.id, contact])),
    [allContacts],
  );

  const sortedConversations = useMemo(() => {
    return [...conversations].sort((a, b) => {
      const aLast = a.messages[a.messages.length - 1]?.createdAt ?? 0;
      const bLast = b.messages[b.messages.length - 1]?.createdAt ?? 0;
      return bLast - aLast;
    });
  }, [conversations]);

  const activeConversation = conversations.find((conv) => conv.id === activeConversationId);
  const activeContact = activeConversation
    ? contactMap.get(activeConversation.contactId)
    : undefined;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConversation?.messages.length, activeConversationId]);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!activeConversation || !draft.trim()) return;
    void sendMessage(activeConversation.id, draft);
    setDraft("");
  }

  function handleSelectContact(contact: MessageContact) {
    void openConversationWithContact(contact);
  }

  return (
    <>
      <div className="flex h-[calc(100vh-8.5rem)] min-h-[520px] overflow-hidden rounded-2xl border border-white/10 bg-[#141414]">
        <aside className="flex w-full max-w-xs shrink-0 flex-col border-r border-white/10 bg-[#111111]">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
            <h2 className="font-semibold text-white">Messages</h2>
            <button
              type="button"
              onClick={() => setNewMessageOpen(true)}
              className="rounded-lg border border-white/10 p-2 text-zinc-300 transition hover:border-[#FACC15]/40 hover:text-[#FACC15]"
              aria-label="New message"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {loadingConversations ? (
              <p className="px-3 py-4 text-sm text-zinc-500">Loading conversations...</p>
            ) : sortedConversations.length === 0 ? (
              <p className="px-3 py-4 text-sm text-zinc-500">
                No conversations yet. Tap + to message a registered user.
              </p>
            ) : (
              sortedConversations.map((conversation) => {
                const contact = contactMap.get(conversation.contactId);
                if (!contact) return null;
                return (
                  <ConversationListItem
                    key={conversation.id}
                    contact={contact}
                    preview={getConversationPreview(conversation)}
                    active={conversation.id === activeConversationId}
                    onClick={() => void openConversationWithContact(contact)}
                  />
                );
              })
            )}
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col bg-[#0A0A0A]">
          {activeConversation && activeContact ? (
            <>
              <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
                <ContactAvatar contact={activeContact} />
                <div>
                  <p className="font-semibold text-white">{activeContact.name}</p>
                  <p className="text-xs text-zinc-500">
                    {activeContact.type === "ai"
                      ? "AI assistant"
                      : activeContact.subtitle ?? "Member"}
                  </p>
                </div>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                {activeConversation.messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    contact={activeContact}
                  />
                ))}
                <div ref={messagesEndRef} />
              </div>

              <form
                onSubmit={handleSend}
                className="flex items-center gap-3 border-t border-white/10 px-5 py-4"
              >
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Type a reply..."
                  className="flex-1 rounded-xl border border-[#FACC15]/30 bg-[#141414] px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-[#FACC15]"
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
              <p className="text-lg font-medium text-white">Select a conversation</p>
              <p className="max-w-sm text-sm text-zinc-500">
                Pick a thread from the left or start a new message with the + button. Opening a
                chat loads the full history.
              </p>
              <button
                type="button"
                onClick={() => setNewMessageOpen(true)}
                className="mt-2 rounded-lg bg-[#FACC15] px-4 py-2 text-sm font-semibold text-black hover:bg-[#e6c200]"
              >
                New Message
              </button>
            </div>
          )}
        </section>
      </div>

      <ClerkNewMessageModal
        open={newMessageOpen}
        onClose={() => setNewMessageOpen(false)}
        onSelectContact={handleSelectContact}
      />
    </>
  );
}

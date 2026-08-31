"use client";

import { create } from "zustand";
import api from "@/lib/api";
import { mergeChatMessages } from "@/lib/merge-chat-messages";
import { useAuthStore } from "@/stores/auth-store";

export type MessageSender = "owner" | "contact";

export interface ChatMessage {
  id: string;
  sender: MessageSender;
  text: string;
  time: string;
  createdAt: number;
}

export type ContactType = "member";

export interface MessageContact {
  id: string;
  name: string;
  subtitle?: string;
  avatarUrl?: string;
  type: ContactType;
  isOnline?: boolean;
  unreadCount?: number;
}

export interface Conversation {
  id: string;
  contactId: string;
  messages: ChatMessage[];
}

function roleLabel(role: string): string {
  switch (role) {
    case "OWNER":
      return "Gym Owner";
    case "ADMIN":
      return "Admin";
    case "CLERK":
      return "Clerk";
    default:
      return "Member";
  }
}

function toContact(user: {
  id: string;
  fullName: string;
  role: string;
  avatarUrl?: string | null;
  unreadCount?: number;
}): MessageContact {
  return {
    id: user.id,
    name: user.fullName,
    subtitle: roleLabel(user.role),
    avatarUrl: user.avatarUrl || undefined,
    type: "member",
    unreadCount: user.unreadCount ?? 0,
  };
}

export function formatMessageTime(date = new Date()) {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function getConversationPreview(
  conversation: Conversation,
  _contactName: string,
): string {
  const last = conversation.messages[conversation.messages.length - 1];
  if (!last) return "No messages yet";
  const prefix = last.sender === "owner" ? "You: " : "";
  const snippet = last.text.length > 42 ? `${last.text.slice(0, 42)}...` : last.text;
  return `${prefix}${snippet}`;
}

export function getContactInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

interface RawDirectMessage {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  createdAt: string;
}

interface OwnerMessagesState {
  currentUserId: string | null;
  contacts: MessageContact[];
  conversations: Conversation[];
  activeConversationId: string;
  loadingConversations: boolean;
  searchQuery: string;
  searchResults: MessageContact[];
  searching: boolean;
  setCurrentUserId: (id: string) => void;
  fetchConversations: () => Promise<void>;
  searchUsers: (query: string) => Promise<void>;
  clearSearch: () => void;
  setActiveConversation: (id: string) => void;
  openConversationWithContact: (contact: MessageContact) => Promise<string>;
  sendMessage: (conversationId: string, text: string) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<void>;
  receiveMessage: (
    raw: RawDirectMessage,
    sender: { id: string; fullName: string; role: string; avatarUrl?: string | null },
  ) => void;
}

function toChatMessage(raw: RawDirectMessage, currentUserId: string): ChatMessage {
  const date = new Date(raw.createdAt);
  return {
    id: raw.id,
    sender: raw.senderId === currentUserId ? "owner" : "contact",
    text: raw.text,
    time: formatMessageTime(date),
    createdAt: date.getTime(),
  };
}

export const useOwnerMessagesStore = create<OwnerMessagesState>()((set, get) => ({
  currentUserId: null,
  contacts: [],
  conversations: [],
  activeConversationId: "",
  loadingConversations: false,
  searchQuery: "",
  searchResults: [],
  searching: false,

  setCurrentUserId: (id) => set({ currentUserId: id }),

  fetchConversations: async () => {
    set({ loadingConversations: true });
    try {
      const { data } = await api.get("/messages/conversations");
      if (data.success) {
        const currentUserId = get().currentUserId;
        const dbContacts: MessageContact[] = data.data.map(
          (row: {
            user: { id: string; fullName: string; role: string; avatarUrl?: string | null };
            unreadCount?: number;
          }) => toContact({ ...row.user, unreadCount: row.unreadCount }),
        );
        const dbConversations: Conversation[] = data.data.map(
          (row: {
            user: { id: string };
            lastMessage: string;
            lastMessageAt: string;
            lastSenderId: string;
          }) => {
            const previewMessage: ChatMessage | null = currentUserId
              ? toChatMessage(
                  {
                    id: `preview-${row.user.id}`,
                    senderId: row.lastSenderId,
                    receiverId: currentUserId,
                    text: row.lastMessage,
                    createdAt: row.lastMessageAt,
                  },
                  currentUserId,
                )
              : null;
            return {
              id: row.user.id,
              contactId: row.user.id,
              messages: previewMessage ? [previewMessage] : [],
            };
          },
        );

        const conversations = dbConversations.map((conv) => {
          const existing = get().conversations.find((c) => c.id === conv.id);
          const keepLive =
            existing &&
            existing.messages.length > 0 &&
            (existing.messages.length > 1 ||
              existing.messages.some((m) => !m.id.startsWith("preview-")));
          return keepLive ? { ...conv, messages: existing.messages } : conv;
        });

        // Mirror Admin: select first conversation without forcing a getThread reload.
        const prevActive = get().activeConversationId;
        const activeConversationId =
          prevActive && conversations.some((c) => c.id === prevActive)
            ? prevActive
            : conversations[0]?.id ?? "";

        set({
          contacts: dbContacts,
          conversations,
          activeConversationId,
          loadingConversations: false,
        });
        return;
      }
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    }
    set({ loadingConversations: false });
  },

  searchUsers: async (query) => {
    set({ searchQuery: query });
    const trimmed = query.trim();
    if (!trimmed) {
      set({ searchResults: [], searching: false });
      return;
    }
    set({ searching: true });
    try {
      const { data } = await api.get("/messages/search", { params: { q: trimmed } });
      if (data.success) {
        set({ searchResults: data.data.map(toContact), searching: false });
        return;
      }
    } catch (error) {
      console.error("Failed to search users:", error);
    }
    set({ searching: false });
  },

  clearSearch: () => set({ searchQuery: "", searchResults: [] }),

  setActiveConversation: (id) => {
    set({ activeConversationId: id });
    const contact = get().contacts.find((c) => c.id === id);
    if (contact) void get().openConversationWithContact(contact);
  },

  receiveMessage: (raw, sender) => {
    const currentUserId = get().currentUserId || useAuthStore.getState().user?.id || null;
    if (!currentUserId) return;
    if (get().currentUserId !== currentUserId) set({ currentUserId });

    const senderId = String(raw.senderId);
    const receiverId = String(raw.receiverId);
    const messageId = String(raw.id);
    const contactId = senderId === currentUserId ? receiverId : senderId;
    if (!contactId) return;

    const existingConversation = get().conversations.find((conv) => conv.id === contactId);
    if (existingConversation?.messages.some((m) => m.id === messageId)) return;

    if (senderId === currentUserId && existingConversation) {
      const optimistic = existingConversation.messages.find(
        (m) => m.id.startsWith("msg-") && m.text === raw.text,
      );
      if (optimistic) {
        const confirmed = toChatMessage(
          { ...raw, id: messageId, senderId, receiverId },
          currentUserId,
        );
        set({
          conversations: get().conversations.map((conv) =>
            conv.id === contactId
              ? {
                  ...conv,
                  messages: conv.messages.map((m) =>
                    m.id === optimistic.id ? confirmed : m,
                  ),
                }
              : conv,
          ),
        });
        return;
      }
    }

    const contactExists = get().contacts.some((c) => c.id === contactId);
    if (!contactExists) {
      set({ contacts: [...get().contacts, toContact({ ...sender, id: String(sender.id) || contactId })] });
    }

    const message = toChatMessage(
      { ...raw, id: messageId, senderId, receiverId },
      currentUserId,
    );
    const active = get().activeConversationId === contactId;

    if (existingConversation) {
      const withoutPreview = existingConversation.messages.filter(
        (m) => !(m.id.startsWith("preview-") && m.text === message.text),
      );
      set({
        conversations: get().conversations.map((conv) =>
          conv.id === contactId
            ? { ...conv, messages: [...withoutPreview, message] }
            : conv,
        ),
        contacts: get().contacts.map((c) =>
          c.id === contactId && !active && senderId !== currentUserId
            ? { ...c, unreadCount: (c.unreadCount || 0) + 1 }
            : c,
        ),
        activeConversationId: get().activeConversationId || contactId,
      });
    } else {
      set({
        conversations: [
          { id: contactId, contactId, messages: [message] },
          ...get().conversations,
        ],
        contacts: contactExists
          ? get().contacts
          : [
              toContact({
                ...sender,
                id: String(sender.id) || contactId,
                unreadCount: senderId === currentUserId ? 0 : 1,
              }),
              ...get().contacts,
            ],
        activeConversationId: get().activeConversationId || contactId,
      });
    }

    if (active && senderId !== currentUserId) {
      void api.post(`/messages/thread/${contactId}/read`).catch(() => undefined);
    }
  },

  openConversationWithContact: async (contact) => {
    const currentUserId = get().currentUserId;
    const existingContact = get().contacts.some((c) => c.id === contact.id);
    if (!existingContact) {
      set({ contacts: [...get().contacts, contact] });
    }

    let existingConversation = get().conversations.find((conv) => conv.id === contact.id);
    if (!existingConversation) {
      existingConversation = { id: contact.id, contactId: contact.id, messages: [] };
      set({ conversations: [...get().conversations, existingConversation] });
    }

    set({ activeConversationId: contact.id });

    try {
      const { data } = await api.get(`/messages/thread/${contact.id}`);
      if (data.success && currentUserId) {
        const fromServer = data.data.messages.map((m: RawDirectMessage) =>
          toChatMessage(m, currentUserId),
        );
        // Merge so in-flight socket messages are not wiped (Admin realtime behavior).
        const local =
          get().conversations.find((conv) => conv.id === contact.id)?.messages ?? [];
        const messages = mergeChatMessages(local, fromServer);
        set({
          conversations: get().conversations.map((conv) =>
            conv.id === contact.id ? { ...conv, messages } : conv,
          ),
          contacts: get().contacts.map((c) =>
            c.id === contact.id ? { ...c, unreadCount: 0 } : c,
          ),
        });
      }
      void api.post(`/messages/thread/${contact.id}/read`).catch(() => undefined);
    } catch (error) {
      console.error("Failed to load conversation thread:", error);
    }

    return contact.id;
  },

  sendMessage: async (conversationId, text) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const optimisticMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: "owner",
      text: trimmed,
      time: formatMessageTime(),
      createdAt: Date.now(),
    };

    set({
      conversations: get().conversations.map((conv) =>
        conv.id === conversationId
          ? { ...conv, messages: [...conv.messages, optimisticMessage] }
          : conv,
      ),
    });

    try {
      const { data } = await api.post("/messages", {
        receiverId: conversationId,
        text: trimmed,
      });
      if (data.success) {
        const currentUserId = get().currentUserId;
        const confirmed = currentUserId
          ? toChatMessage(data.data, currentUserId)
          : optimisticMessage;
        set({
          conversations: get().conversations.map((conv) =>
            conv.id === conversationId
              ? {
                  ...conv,
                  messages: conv.messages.map((m) =>
                    m.id === optimisticMessage.id ? confirmed : m,
                  ),
                }
              : conv,
          ),
        });
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      set({
        conversations: get().conversations.map((conv) =>
          conv.id === conversationId
            ? {
                ...conv,
                messages: conv.messages.filter((m) => m.id !== optimisticMessage.id),
              }
            : conv,
        ),
      });
    }
  },

  deleteConversation: async (conversationId) => {
    try {
      await api.delete(`/messages/conversations/${conversationId}`);
      const remainingConversations = get().conversations.filter(
        (c) => c.id !== conversationId,
      );
      set({
        conversations: remainingConversations,
        contacts: get().contacts.filter((c) => c.id !== conversationId),
        activeConversationId:
          get().activeConversationId === conversationId
            ? remainingConversations[0]?.id ?? ""
            : get().activeConversationId,
      });
    } catch (error) {
      console.error("Failed to delete conversation:", error);
    }
  },
}));

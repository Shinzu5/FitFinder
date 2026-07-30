"use client";

import { create } from "zustand";
import api from "@/lib/api";

export type MessageSender = "me" | "contact";

export interface ChatMessage {
  id: string;
  sender: MessageSender;
  text: string;
  time: string;
  createdAt: number;
}

export type ContactType = "member" | "ai";

export interface MessageContact {
  id: string;
  name: string;
  subtitle?: string;
  avatarUrl?: string;
  type: ContactType;
  isOnline?: boolean;
  geminiTag?: boolean;
}

export interface Conversation {
  id: string;
  contactId: string;
  messages: ChatMessage[];
}

const AI_CONTACT: MessageContact = {
  id: "contact-ai",
  name: "Fitness AI",
  subtitle: "Your AI assistant",
  type: "ai",
  geminiTag: true,
};

const AI_CONVERSATION: Conversation = {
  id: "conv-ai",
  contactId: "contact-ai",
  messages: [
    {
      id: "msg-ai-1",
      sender: "contact",
      text: "Hi! I'm your Fitness AI assistant. Ask me about workouts, nutrition, or gym policies.",
      time: "9:00 AM",
      createdAt: Date.now(),
    },
  ],
};

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
}): MessageContact {
  return {
    id: user.id,
    name: user.fullName,
    subtitle: roleLabel(user.role),
    avatarUrl: user.avatarUrl || undefined,
    type: "member",
  };
}

export function formatMessageTime(date = new Date()) {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function getConversationPreview(conversation: Conversation): string {
  const last = conversation.messages[conversation.messages.length - 1];
  if (!last) return "No messages yet";
  const prefix = last.sender === "me" ? "You: " : "";
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

interface ClerkMessagesState {
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
  receiveMessage: (
    raw: RawDirectMessage,
    sender: { id: string; fullName: string; role: string; avatarUrl?: string | null },
  ) => void;
}

function toChatMessage(raw: RawDirectMessage, currentUserId: string): ChatMessage {
  const date = new Date(raw.createdAt);
  return {
    id: raw.id,
    sender: raw.senderId === currentUserId ? "me" : "contact",
    text: raw.text,
    time: formatMessageTime(date),
    createdAt: date.getTime(),
  };
}

export const useClerkMessagesStore = create<ClerkMessagesState>()((set, get) => ({
  currentUserId: null,
  contacts: [AI_CONTACT],
  conversations: [AI_CONVERSATION],
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
        const dbContacts: MessageContact[] = data.data.map((row: any) => toContact(row.user));
        const dbConversations: Conversation[] = data.data.map((row: any) => {
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
        });

        set({
          contacts: [AI_CONTACT, ...dbContacts],
          conversations: [
            AI_CONVERSATION,
            ...dbConversations.map((conv) => {
              const existing = get().conversations.find((c) => c.id === conv.id);
              return existing && existing.messages.length > 1 ? existing : conv;
            }),
          ],
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

  setActiveConversation: (id) => set({ activeConversationId: id }),

  receiveMessage: (raw, sender) => {
    const currentUserId = get().currentUserId;
    if (!currentUserId) return;

    const contactId = raw.senderId === currentUserId ? raw.receiverId : raw.senderId;

    const contactExists = get().contacts.some((c) => c.id === contactId);
    if (!contactExists) {
      set({ contacts: [...get().contacts, toContact(sender)] });
    }

    const message = toChatMessage(raw, currentUserId);
    const existingConversation = get().conversations.find((conv) => conv.id === contactId);

    if (existingConversation) {
      if (existingConversation.messages.some((m) => m.id === message.id)) return;
      set({
        conversations: get().conversations.map((conv) =>
          conv.id === contactId ? { ...conv, messages: [...conv.messages, message] } : conv,
        ),
      });
    } else {
      set({
        conversations: [...get().conversations, { id: contactId, contactId, messages: [message] }],
      });
    }
  },

  openConversationWithContact: async (contact) => {
    if (contact.type === "ai") {
      set({ activeConversationId: AI_CONVERSATION.id });
      return AI_CONVERSATION.id;
    }

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

    // Load full thread history ("back-read") from PostgreSQL
    try {
      const { data } = await api.get(`/messages/thread/${contact.id}`);
      if (data.success && currentUserId) {
        const messages = data.data.messages.map((m: RawDirectMessage) =>
          toChatMessage(m, currentUserId),
        );
        set({
          conversations: get().conversations.map((conv) =>
            conv.id === contact.id ? { ...conv, messages } : conv,
          ),
        });
      }
    } catch (error) {
      console.error("Failed to load conversation thread:", error);
    }

    return contact.id;
  },

  sendMessage: async (conversationId, text) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    if (conversationId === AI_CONVERSATION.id) {
      const message: ChatMessage = {
        id: `msg-${Date.now()}`,
        sender: "me",
        text: trimmed,
        time: formatMessageTime(),
        createdAt: Date.now(),
      };
      set({
        conversations: get().conversations.map((conv) =>
          conv.id === conversationId ? { ...conv, messages: [...conv.messages, message] } : conv,
        ),
      });

      window.setTimeout(() => {
        const reply: ChatMessage = {
          id: `msg-ai-reply-${Date.now()}`,
          sender: "contact",
          text: "Thanks for your message! I can help with workout plans, nutrition tips, and gym FAQs. What would you like to know?",
          time: formatMessageTime(),
          createdAt: Date.now(),
        };
        set({
          conversations: get().conversations.map((conv) =>
            conv.id === conversationId ? { ...conv, messages: [...conv.messages, reply] } : conv,
          ),
        });
      }, 900);
      return;
    }

    const optimisticMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: "me",
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
    }
  },
}));

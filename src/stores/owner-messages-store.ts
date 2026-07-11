"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type MessageSender = "owner" | "contact";

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

export const DEFAULT_MESSAGE_CONTACTS: MessageContact[] = [
  {
    id: "contact-ai",
    name: "Fitness AI",
    subtitle: "Your AI assistant",
    type: "ai",
    geminiTag: true,
  },
  {
    id: "contact-alex-cruz",
    name: "Alex Cruz",
    type: "member",
    isOnline: true,
    avatarUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80",
  },
  {
    id: "contact-maria-santos",
    name: "Maria Santos",
    type: "member",
    avatarUrl:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80",
  },
];

const DEFAULT_CONVERSATIONS: Conversation[] = [
  {
    id: "conv-ai",
    contactId: "contact-ai",
    messages: [
      {
        id: "msg-ai-1",
        sender: "contact",
        text: "Hi! I'm your Fitness AI assistant. Ask me about workouts, nutrition, or gym policies.",
        time: "9:00 AM",
        createdAt: Date.now() - 1000 * 60 * 60 * 4,
      },
    ],
  },
  {
    id: "conv-alex-cruz",
    contactId: "contact-alex-cruz",
    messages: [
      {
        id: "msg-alex-1",
        sender: "contact",
        text: "Can I freeze my membership until next month? I will be travelling for work.",
        time: "10:28 AM",
        createdAt: Date.now() - 1000 * 60 * 12,
      },
      {
        id: "msg-alex-2",
        sender: "owner",
        text: "Hi Alex! Membership freeze is allowed for up to 30 days upon request.",
        time: "10:30 AM",
        createdAt: Date.now() - 1000 * 60 * 10,
      },
      {
        id: "msg-alex-3",
        sender: "owner",
        text: "We open at 8 AM and close by 9 PM on weekends. Drop by anytime!",
        time: "10:30 AM",
        createdAt: Date.now() - 1000 * 60 * 9,
      },
      {
        id: "msg-alex-4",
        sender: "contact",
        text: "Perfect, thank you! I'll visit on Saturday morning.",
        time: "10:32 AM",
        createdAt: Date.now() - 1000 * 60 * 7,
      },
    ],
  },
  {
    id: "conv-maria-santos",
    contactId: "contact-maria-santos",
    messages: [
      {
        id: "msg-maria-1",
        sender: "contact",
        text: "Can I freeze my membership until next month?",
        time: "Yesterday",
        createdAt: Date.now() - 1000 * 60 * 60 * 26,
      },
    ],
  },
];

interface OwnerMessagesState {
  contacts: MessageContact[];
  conversations: Conversation[];
  activeConversationId: string;
  addContact: (contact: MessageContact) => void;
  setActiveConversation: (id: string) => void;
  openConversationWithContact: (contactId: string) => string;
  sendMessage: (conversationId: string, text: string) => void;
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
  contactName: string,
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

export const useOwnerMessagesStore = create<OwnerMessagesState>()(
  persist(
    (set, get) => ({
      contacts: DEFAULT_MESSAGE_CONTACTS,
      conversations: DEFAULT_CONVERSATIONS,
      activeConversationId: "conv-alex-cruz",

      addContact: (contact) => {
        const exists = get().contacts.some((item) => item.id === contact.id);
        if (exists) return;
        set({ contacts: [...get().contacts, contact] });
      },

      setActiveConversation: (id) => set({ activeConversationId: id }),

      openConversationWithContact: (contactId) => {
        const existing = get().conversations.find((conv) => conv.contactId === contactId);
        if (existing) {
          set({ activeConversationId: existing.id });
          return existing.id;
        }

        const newConversation: Conversation = {
          id: `conv-${contactId}-${Date.now()}`,
          contactId,
          messages: [],
        };

        set({
          conversations: [...get().conversations, newConversation],
          activeConversationId: newConversation.id,
        });
        return newConversation.id;
      },

      sendMessage: (conversationId, text) => {
        const trimmed = text.trim();
        if (!trimmed) return;

        const message: ChatMessage = {
          id: `msg-${Date.now()}`,
          sender: "owner",
          text: trimmed,
          time: formatMessageTime(),
          createdAt: Date.now(),
        };

        set({
          conversations: get().conversations.map((conv) =>
            conv.id === conversationId
              ? { ...conv, messages: [...conv.messages, message] }
              : conv,
          ),
        });

        const conversation = get().conversations.find((conv) => conv.id === conversationId);
        const contact = get().contacts.find((item) => item.id === conversation?.contactId);

        if (contact?.type === "ai") {
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
                conv.id === conversationId
                  ? { ...conv, messages: [...conv.messages, reply] }
                  : conv,
              ),
            });
          }, 900);
        }
      },
    }),
    {
      name: "fitfinder-owner-messages",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

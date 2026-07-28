"use client";

import { create } from "zustand";
import api from "@/lib/api";

export type UserMessageSender = "member" | "gym";

export interface UserChatMessage {
  id: string;
  sender: UserMessageSender;
  text: string;
  time: string;
  createdAt: number;
}

// Kept as "gym*"/"owner*" field names for compatibility with the existing UI,
// but a thread can now be with any registered user (owner, admin, clerk, member).
export interface GymMessageThread {
  id: string;
  gymId: string;
  gymName: string;
  gymImageUrl: string;
  ownerName: string;
  ownerAvatarUrl: string;
  isOnline: boolean;
  messages: UserChatMessage[];
}

export interface UserSearchContact {
  id: string;
  name: string;
  subtitle: string;
  avatarUrl: string;
}

function avatarFor(name: string, avatarUrl?: string | null): string {
  if (avatarUrl) return avatarUrl;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=FACC15&color=000000&bold=true`;
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

function toSearchContact(user: {
  id: string;
  fullName: string;
  role: string;
  avatarUrl?: string | null;
}): UserSearchContact {
  return {
    id: user.id,
    name: user.fullName,
    subtitle: roleLabel(user.role),
    avatarUrl: avatarFor(user.fullName, user.avatarUrl),
  };
}

export function formatUserMessageTime(date = new Date()) {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function getThreadPreview(thread: GymMessageThread): string {
  const last = thread.messages[thread.messages.length - 1];
  if (!last) return "No messages yet";
  const prefix = last.sender === "member" ? "You: " : "";
  const snippet = last.text.length > 48 ? `${last.text.slice(0, 48)}...` : last.text;
  return `${prefix}${snippet}`;
}

interface RawDirectMessage {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  createdAt: string;
}

function toChatMessage(raw: RawDirectMessage, currentUserId: string): UserChatMessage {
  const date = new Date(raw.createdAt);
  return {
    id: raw.id,
    sender: raw.senderId === currentUserId ? "member" : "gym",
    text: raw.text,
    time: formatUserMessageTime(date),
    createdAt: date.getTime(),
  };
}

function threadFromContact(contact: UserSearchContact): GymMessageThread {
  return {
    id: contact.id,
    gymId: contact.id,
    gymName: contact.subtitle,
    gymImageUrl: contact.avatarUrl,
    ownerName: contact.name,
    ownerAvatarUrl: contact.avatarUrl,
    isOnline: false,
    messages: [],
  };
}

interface UserMessagesState {
  currentUserId: string | null;
  threads: GymMessageThread[];
  activeThreadId: string;
  loadingThreads: boolean;
  searchQuery: string;
  searchResults: UserSearchContact[];
  searching: boolean;
  setCurrentUserId: (id: string) => void;
  fetchThreads: () => Promise<void>;
  searchUsers: (query: string) => Promise<void>;
  clearSearch: () => void;
  setActiveThread: (id: string) => void;
  openThreadWithContact: (contact: UserSearchContact) => Promise<string>;
  sendMessage: (threadId: string, text: string) => Promise<void>;
  syncJoinedGym: (gymId: string | null, gymName: string | null) => void;
  receiveMessage: (
    raw: RawDirectMessage,
    sender: { id: string; fullName: string; role: string; avatarUrl?: string | null },
  ) => void;
}

export const useUserMessagesStore = create<UserMessagesState>()((set, get) => ({
  currentUserId: null,
  threads: [],
  activeThreadId: "",
  loadingThreads: false,
  searchQuery: "",
  searchResults: [],
  searching: false,

  setCurrentUserId: (id) => set({ currentUserId: id }),

  fetchThreads: async () => {
    set({ loadingThreads: true });
    try {
      const { data } = await api.get("/messages/conversations");
      if (data.success) {
        const currentUserId = get().currentUserId;
        const dbThreads: GymMessageThread[] = data.data.map((row: any) => {
          const previewMessage: UserChatMessage | null = currentUserId
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
          const thread = threadFromContact(toSearchContact(row.user));
          return { ...thread, messages: previewMessage ? [previewMessage] : [] };
        });

        set({
          threads: dbThreads.map((thread) => {
            const existing = get().threads.find((t) => t.id === thread.id);
            return existing && existing.messages.length > 1 ? existing : thread;
          }),
          loadingThreads: false,
        });
        return;
      }
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    }
    set({ loadingThreads: false });
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
        set({ searchResults: data.data.map(toSearchContact), searching: false });
        return;
      }
    } catch (error) {
      console.error("Failed to search users:", error);
    }
    set({ searching: false });
  },

  clearSearch: () => set({ searchQuery: "", searchResults: [] }),

  setActiveThread: (id) => set({ activeThreadId: id }),

  receiveMessage: (raw, sender) => {
    const currentUserId = get().currentUserId;
    if (!currentUserId) return;

    const contactId = raw.senderId === currentUserId ? raw.receiverId : raw.senderId;
    const message = toChatMessage(raw, currentUserId);
    const existingThread = get().threads.find((t) => t.id === contactId);

    if (existingThread) {
      if (existingThread.messages.some((m) => m.id === message.id)) return;
      set({
        threads: get().threads.map((t) =>
          t.id === contactId ? { ...t, messages: [...t.messages, message] } : t,
        ),
      });
    } else {
      const newThread = threadFromContact(toSearchContact(sender));
      set({ threads: [{ ...newThread, messages: [message] }, ...get().threads] });
    }
  },

  openThreadWithContact: async (contact) => {
    const currentUserId = get().currentUserId;

    let thread = get().threads.find((t) => t.id === contact.id);
    if (!thread) {
      thread = threadFromContact(contact);
      set({ threads: [thread, ...get().threads] });
    }

    set({ activeThreadId: contact.id });

    try {
      const { data } = await api.get(`/messages/thread/${contact.id}`);
      if (data.success && currentUserId) {
        const messages = data.data.messages.map((m: RawDirectMessage) =>
          toChatMessage(m, currentUserId),
        );
        set({
          threads: get().threads.map((t) => (t.id === contact.id ? { ...t, messages } : t)),
        });
      }
    } catch (error) {
      console.error("Failed to load conversation thread:", error);
    }

    return contact.id;
  },

  sendMessage: async (threadId, text) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const optimisticMessage: UserChatMessage = {
      id: `umsg-${Date.now()}`,
      sender: "member",
      text: trimmed,
      time: formatUserMessageTime(),
      createdAt: Date.now(),
    };

    set({
      threads: get().threads.map((thread) =>
        thread.id === threadId
          ? { ...thread, messages: [...thread.messages, optimisticMessage] }
          : thread,
      ),
    });

    try {
      const { data } = await api.post("/messages", {
        receiverId: threadId,
        text: trimmed,
      });
      if (data.success) {
        const currentUserId = get().currentUserId;
        const confirmed = currentUserId ? toChatMessage(data.data, currentUserId) : optimisticMessage;
        set({
          threads: get().threads.map((thread) =>
            thread.id === threadId
              ? {
                  ...thread,
                  messages: thread.messages.map((m) =>
                    m.id === optimisticMessage.id ? confirmed : m,
                  ),
                }
              : thread,
          ),
        });
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  },

  syncJoinedGym: (gymId) => {
    if (!gymId) return;
    (async () => {
      try {
        const { data } = await api.get(`/gyms/${gymId}`);
        if (!data.success || !data.data?.owner) return;

        const owner = data.data.owner;
        const contact = toSearchContact({
          id: owner.id,
          fullName: owner.fullName,
          role: "OWNER",
          avatarUrl: owner.avatarUrl,
        });

        const exists = get().threads.some((t) => t.id === contact.id);
        if (!exists) {
          const thread = threadFromContact(contact);
          set({ threads: [thread, ...get().threads] });
        }

        // Only auto-focus the gym's thread if nothing is selected yet.
        if (!get().activeThreadId) {
          set({ activeThreadId: contact.id });
        }
      } catch (error) {
        console.error("Failed to sync joined gym thread:", error);
      }
    })();
  },
}));

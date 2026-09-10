"use client";

import { create } from "zustand";
import api from "@/lib/api";
import { asRecord } from "@/lib/api-error";
import { mergeChatMessages } from "@/lib/merge-chat-messages";
import { useAuthStore } from "@/stores/auth-store";

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

function resolveCurrentUserId(fallback?: string | null): string | null {
  return fallback || useAuthStore.getState().user?.id || null;
}

function normalizeId(id: string | number | null | undefined): string {
  return id == null ? "" : String(id);
}

function toChatMessage(raw: RawDirectMessage, currentUserId: string): UserChatMessage {
  const date = new Date(raw.createdAt);
  return {
    id: normalizeId(raw.id),
    sender: normalizeId(raw.senderId) === currentUserId ? "member" : "gym",
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
  deleteConversation: (threadId: string) => Promise<void>;
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
        const currentUserId = resolveCurrentUserId(get().currentUserId);
        if (currentUserId && get().currentUserId !== currentUserId) {
          set({ currentUserId });
        }
        const previous = get().threads;
        const dbThreads: GymMessageThread[] = (Array.isArray(data.data) ? data.data : []).map(
          (value: unknown) => {
          const row = asRecord(value);
          const user = asRecord(row.user);
          const previewMessage: UserChatMessage | null = currentUserId
            ? toChatMessage(
                {
                  id: `preview-${String(user.id ?? "")}`,
                  senderId: String(row.lastSenderId ?? ""),
                  receiverId: currentUserId,
                  text: String(row.lastMessage ?? ""),
                  createdAt: String(row.lastMessageAt ?? ""),
                },
                currentUserId,
              )
            : null;
          const thread = threadFromContact(
            toSearchContact({
              id: String(user.id ?? ""),
              fullName: String(user.fullName ?? ""),
              role: String(user.role ?? ""),
              avatarUrl: user.avatarUrl ? String(user.avatarUrl) : null,
            }),
          );
          return { ...thread, messages: previewMessage ? [previewMessage] : [] };
        });

        const threads = dbThreads.map((thread) => {
          const existing = previous.find((t) => t.id === thread.id);
          const keepLive =
            existing &&
            existing.messages.length > 0 &&
            (existing.messages.length > thread.messages.length ||
              existing.messages.some((m) => !m.id.startsWith("preview-")));
          if (keepLive) {
            return {
              ...thread,
              messages: existing.messages,
              isOnline: existing.isOnline,
            };
          }
          return thread;
        });

        // Mirror Admin: select first thread without forcing getThread.
        const prevActive = get().activeThreadId;
        const activeThreadId =
          prevActive && threads.some((t) => t.id === prevActive)
            ? prevActive
            : threads[0]?.id ?? "";

        set({
          threads,
          activeThreadId,
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

  setActiveThread: (id) => {
    // Select immediately (Admin-style). Load history with merge so sockets aren't wiped.
    set({ activeThreadId: id });
    const thread = get().threads.find((t) => t.id === id);
    if (!thread) return;
    void get().openThreadWithContact({
      id: thread.id,
      name: thread.ownerName,
      subtitle: thread.gymName,
      avatarUrl: thread.ownerAvatarUrl,
    });
  },

  receiveMessage: (raw, sender) => {
    const currentUserId = resolveCurrentUserId(get().currentUserId);
    if (!currentUserId) return;
    if (get().currentUserId !== currentUserId) {
      set({ currentUserId });
    }

    const senderId = normalizeId(raw.senderId);
    const receiverId = normalizeId(raw.receiverId);
    const messageId = normalizeId(raw.id);
    const contactId = senderId === currentUserId ? receiverId : senderId;
    if (!contactId) return;

    const existingThread = get().threads.find((t) => t.id === contactId);
    if (existingThread?.messages.some((m) => m.id === messageId)) return;

    // Replace optimistic local send with the server-confirmed message.
    if (senderId === currentUserId && existingThread) {
      const optimistic = existingThread.messages.find(
        (m) => m.id.startsWith("umsg-") && m.text === raw.text,
      );
      if (optimistic) {
        const confirmed = toChatMessage(
          { ...raw, id: messageId, senderId, receiverId },
          currentUserId,
        );
        set({
          threads: get().threads.map((t) =>
            t.id === contactId
              ? {
                  ...t,
                  messages: t.messages.map((m) => (m.id === optimistic.id ? confirmed : m)),
                }
              : t,
          ),
        });
        return;
      }
    }

    const message = toChatMessage(
      { ...raw, id: messageId, senderId, receiverId },
      currentUserId,
    );
    const active =
      get().activeThreadId === contactId ||
      (!get().activeThreadId && get().threads[0]?.id === contactId);

    if (existingThread) {
      // Drop stale single-preview placeholder when the live message arrives.
      const withoutPreview = existingThread.messages.filter(
        (m) => !(m.id.startsWith("preview-") && m.text === message.text),
      );
      const nextMessages = [...withoutPreview, message].sort(
        (a, b) => a.createdAt - b.createdAt,
      );
      set({
        threads: [
          { ...existingThread, messages: nextMessages },
          ...get().threads.filter((t) => t.id !== contactId),
        ],
        activeThreadId: get().activeThreadId || contactId,
      });
    } else {
      const newThread = threadFromContact(
        toSearchContact({
          ...sender,
          id: normalizeId(sender.id) || contactId,
        }),
      );
      set({
        threads: [
          { ...newThread, id: contactId, gymId: contactId, messages: [message] },
          ...get().threads,
        ],
        activeThreadId: get().activeThreadId || contactId,
      });
    }

    if (active && senderId !== currentUserId) {
      void api.post(`/messages/thread/${contactId}/read`).catch(() => undefined);
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
        const fromServer = data.data.messages.map((m: RawDirectMessage) =>
          toChatMessage(m, currentUserId),
        );
        const local = get().threads.find((t) => t.id === contact.id)?.messages ?? [];
        const messages = mergeChatMessages(local, fromServer);
        set({
          threads: get().threads.map((t) => (t.id === contact.id ? { ...t, messages } : t)),
        });
      }
      void api.post(`/messages/thread/${contact.id}/read`).catch(() => undefined);
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

  deleteConversation: async (threadId) => {
    try {
      await api.delete(`/messages/conversations/${threadId}`);
      const remaining = get().threads.filter((t) => t.id !== threadId);
      set({
        threads: remaining,
        activeThreadId:
          get().activeThreadId === threadId ? remaining[0]?.id ?? "" : get().activeThreadId,
      });
    } catch (error) {
      console.error("Failed to delete conversation:", error);
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

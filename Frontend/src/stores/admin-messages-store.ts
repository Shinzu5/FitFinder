"use client";

import { create } from "zustand";
import api from "@/lib/api";
import { mergeChatMessages } from "@/lib/merge-chat-messages";
import { useAuthStore } from "@/stores/auth-store";

export type AdminMessageSender = "owner" | "admin";

export interface AdminSupportMessage {
  id: string;
  sender: AdminMessageSender;
  text: string;
  time: string;
  createdAt: number;
}

export interface OwnerSupportThread {
  id: string;
  ownerName: string;
  ownerAvatarUrl: string;
  gymName: string;
  roleLabel: string;
  isOnline: boolean;
  unreadCount: number;
  messages: AdminSupportMessage[];
}

function formatMessageTime(date = new Date()) {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function roleLabel(role: string): string {
  switch (role) {
    case "OWNER":
      return "Gym Owner";
    case "CLERK":
      return "Clerk";
    case "ADMIN":
      return "Admin";
    default:
      return "Gymer";
  }
}

function initialsAvatar(name: string) {
  const parts = name.trim().split(/\s+/);
  const letters =
    parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`
      : (parts[0]?.[0] || "?");
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(letters)}&background=27272a&color=FACC15&size=128`;
}

export function getOwnerThreadPreview(thread: OwnerSupportThread) {
  const last = thread.messages[thread.messages.length - 1];
  if (!last) return "No messages yet.";
  const prefix = last.sender === "admin" ? "You: " : "";
  return `${prefix}${last.text}`;
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

interface AdminMessagesState {
  currentUserId: string | null;
  threads: OwnerSupportThread[];
  activeThreadId: string;
  loading: boolean;
  searchQuery: string;
  searchResults: Array<{
    id: string;
    name: string;
    subtitle: string;
    avatarUrl?: string;
    role: string;
  }>;
  searching: boolean;
  setCurrentUserId: (id: string) => void;
  fetchConversations: () => Promise<void>;
  setActiveThread: (id: string) => Promise<void>;
  searchUsers: (query: string) => Promise<void>;
  clearSearch: () => void;
  openConversationWithUser: (user: {
    id: string;
    fullName: string;
    role: string;
    avatarUrl?: string | null;
  }) => Promise<void>;
  sendReply: (threadId: string, text: string) => Promise<void>;
  deleteConversation: (threadId: string) => Promise<void>;
  receiveMessage: (
    raw: RawDirectMessage,
    sender: { id: string; fullName: string; role: string; avatarUrl?: string | null },
  ) => void;
}

function toMessage(raw: RawDirectMessage, currentUserId: string): AdminSupportMessage {
  const date = new Date(raw.createdAt);
  return {
    id: raw.id,
    sender: raw.senderId === currentUserId ? "admin" : "owner",
    text: raw.text,
    time: formatMessageTime(date),
    createdAt: date.getTime(),
  };
}

function toThreadFromUser(
  user: { id: string; fullName: string; role: string; avatarUrl?: string | null },
  extras?: { gymName?: string | null; unreadCount?: number; messages?: AdminSupportMessage[] },
): OwnerSupportThread {
  return {
    id: user.id,
    ownerName: user.fullName,
    ownerAvatarUrl: user.avatarUrl || initialsAvatar(user.fullName),
    gymName: extras?.gymName || roleLabel(user.role),
    roleLabel: roleLabel(user.role),
    isOnline: false,
    unreadCount: extras?.unreadCount ?? 0,
    messages: extras?.messages ?? [],
  };
}

export const useAdminMessagesStore = create<AdminMessagesState>((set, get) => ({
  currentUserId: null,
  threads: [],
  activeThreadId: "",
  loading: false,
  searchQuery: "",
  searchResults: [],
  searching: false,

  setCurrentUserId: (id) => set({ currentUserId: id }),

  fetchConversations: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get("/messages/conversations");
      if (!data.success) {
        set({ loading: false });
        return;
      }

      const currentUserId = get().currentUserId;
      const threads: OwnerSupportThread[] = (data.data || []).map(
        (row: {
          user: { id: string; fullName: string; role: string; avatarUrl?: string | null };
          lastMessage: string;
          lastMessageAt: string;
          lastSenderId: string;
          unreadCount?: number;
          gymName?: string | null;
        }) => {
          const existing = get().threads.find((t) => t.id === row.user.id);
          const preview =
            currentUserId
              ? toMessage(
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

          const keepLive =
            existing &&
            existing.messages.length > 0 &&
            (existing.messages.length > 1 ||
              existing.messages.some((m) => !m.id.startsWith("preview-")));

          return toThreadFromUser(row.user, {
            gymName: row.gymName,
            unreadCount: row.unreadCount ?? 0,
            messages: keepLive
              ? existing.messages
              : preview
                ? [preview]
                : [],
          });
        },
      );

      const activeThreadId =
        get().activeThreadId && threads.some((t) => t.id === get().activeThreadId)
          ? get().activeThreadId
          : threads[0]?.id ?? "";

      set({ threads, activeThreadId, loading: false });
    } catch (error) {
      console.error("Failed to fetch admin conversations:", error);
      set({ loading: false });
    }
  },

  setActiveThread: async (id) => {
    set({ activeThreadId: id });
    const currentUserId = get().currentUserId || useAuthStore.getState().user?.id || null;
    if (!id || !currentUserId) return;
    if (get().currentUserId !== currentUserId) set({ currentUserId });

    try {
      const { data } = await api.get(`/messages/thread/${id}`);
      if (data.success) {
        const fromServer = (data.data.messages || []).map((m: RawDirectMessage) =>
          toMessage(m, currentUserId),
        );
        const local = get().threads.find((thread) => thread.id === id)?.messages ?? [];
        const messages = mergeChatMessages(local, fromServer);
        set({
          threads: get().threads.map((thread) =>
            thread.id === id
              ? {
                  ...thread,
                  messages,
                  unreadCount: 0,
                  gymName: data.data.gymName || thread.gymName,
                  ownerName: data.data.user?.fullName || thread.ownerName,
                  ownerAvatarUrl:
                    data.data.user?.avatarUrl ||
                    thread.ownerAvatarUrl ||
                    initialsAvatar(thread.ownerName),
                }
              : thread,
          ),
        });
      }
      void api.post(`/messages/thread/${id}/read`).catch(() => undefined);
    } catch (error) {
      console.error("Failed to load admin thread:", error);
    }
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
        set({
          searchResults: (data.data || []).map(
            (u: { id: string; fullName: string; role: string; avatarUrl?: string | null }) => ({
              id: u.id,
              name: u.fullName,
              subtitle: roleLabel(u.role),
              avatarUrl: u.avatarUrl || undefined,
              role: u.role,
            }),
          ),
          searching: false,
        });
        return;
      }
    } catch (error) {
      console.error("Admin message search failed:", error);
    }
    set({ searching: false });
  },

  clearSearch: () => set({ searchQuery: "", searchResults: [] }),

  openConversationWithUser: async (user) => {
    const exists = get().threads.some((t) => t.id === user.id);
    if (!exists) {
      set({
        threads: [
          toThreadFromUser(user),
          ...get().threads,
        ],
      });
    }
    await get().setActiveThread(user.id);
    get().clearSearch();
  },

  sendReply: async (threadId, text) => {
    const trimmed = text.trim();
    if (!trimmed || !threadId) return;

    const optimistic: AdminSupportMessage = {
      id: `amsg-${Date.now()}`,
      sender: "admin",
      text: trimmed,
      time: formatMessageTime(),
      createdAt: Date.now(),
    };

    set({
      threads: get().threads.map((thread) =>
        thread.id === threadId
          ? { ...thread, messages: [...thread.messages, optimistic] }
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
        const confirmed = currentUserId
          ? toMessage(data.data, currentUserId)
          : optimistic;
        set({
          threads: get().threads.map((thread) =>
            thread.id === threadId
              ? {
                  ...thread,
                  messages: thread.messages.map((m) =>
                    m.id === optimistic.id ? confirmed : m,
                  ),
                }
              : thread,
          ),
        });
      }
    } catch (error) {
      console.error("Failed to send admin reply:", error);
      set({
        threads: get().threads.map((thread) =>
          thread.id === threadId
            ? {
                ...thread,
                messages: thread.messages.filter((m) => m.id !== optimistic.id),
              }
            : thread,
        ),
      });
    }
  },

  deleteConversation: async (threadId) => {
    try {
      await api.delete(`/messages/conversations/${threadId}`);
      const remaining = get().threads.filter((t) => t.id !== threadId);
      set({
        threads: remaining,
        activeThreadId:
          get().activeThreadId === threadId
            ? remaining[0]?.id ?? ""
            : get().activeThreadId,
      });
    } catch (error) {
      console.error("Failed to delete conversation:", error);
    }
  },

  receiveMessage: (raw, sender) => {
    const currentUserId = get().currentUserId || useAuthStore.getState().user?.id || null;
    if (!currentUserId) return;
    if (get().currentUserId !== currentUserId) set({ currentUserId });

    const senderId = String(raw.senderId);
    const receiverId = String(raw.receiverId);
    const messageId = String(raw.id);
    const peerId = senderId === currentUserId ? receiverId : senderId;
    if (!peerId) return;

    const existing = get().threads.find((t) => t.id === peerId);
    if (existing?.messages.some((m) => m.id === messageId)) return;

    if (senderId === currentUserId && existing) {
      const optimistic = existing.messages.find(
        (m) => m.id.startsWith("amsg-") && m.text === raw.text,
      );
      if (optimistic) {
        const confirmed = toMessage(
          { ...raw, id: messageId, senderId, receiverId },
          currentUserId,
        );
        set({
          threads: get().threads.map((thread) =>
            thread.id === peerId
              ? {
                  ...thread,
                  messages: thread.messages.map((m) =>
                    m.id === optimistic.id ? confirmed : m,
                  ),
                }
              : thread,
          ),
        });
        return;
      }
    }

    const message = toMessage(
      { ...raw, id: messageId, senderId, receiverId },
      currentUserId,
    );
    const active = get().activeThreadId === peerId;

    if (existing) {
      const withoutPreview = existing.messages.filter(
        (m) => !(m.id.startsWith("preview-") && m.text === message.text),
      );
      set({
        threads: [
          {
            ...existing,
            messages: [...withoutPreview, message],
            unreadCount:
              active || senderId === currentUserId
                ? existing.unreadCount
                : existing.unreadCount + 1,
          },
          ...get().threads.filter((t) => t.id !== peerId),
        ],
        activeThreadId: get().activeThreadId || peerId,
      });
      if (active && senderId !== currentUserId) {
        void api.post(`/messages/thread/${peerId}/read`).catch(() => undefined);
      }
      return;
    }

    set({
      threads: [
        toThreadFromUser(
          { ...sender, id: String(sender.id) || peerId },
          {
            unreadCount: senderId === currentUserId ? 0 : 1,
            messages: [message],
          },
        ),
        ...get().threads,
      ],
      activeThreadId: get().activeThreadId || peerId,
    });
  },
}));

"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type UserMessageSender = "member" | "gym";

export interface UserChatMessage {
  id: string;
  sender: UserMessageSender;
  text: string;
  time: string;
  createdAt: number;
}

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

const DEFAULT_THREAD: GymMessageThread = {
  id: "thread-abbsy",
  gymId: "gym-1",
  gymName: "Abbsy Mini Gym",
  gymImageUrl:
    "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=200&q=80",
  ownerName: "Renz Aballe",
  ownerAvatarUrl:
    "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=200&q=80",
  isOnline: true,
  messages: [
    {
      id: "umsg-1",
      sender: "gym",
      text: "Welcome to Abbsy Mini Gym! Feel free to message us anytime you have questions.",
      time: "10:28 AM",
      createdAt: Date.now() - 1000 * 60 * 15,
    },
    {
      id: "umsg-2",
      sender: "gym",
      text: "We open at 6 AM and close at 9 PM on Sundays. Weekdays we're open until 10 PM.",
      time: "10:30 AM",
      createdAt: Date.now() - 1000 * 60 * 12,
    },
    {
      id: "umsg-3",
      sender: "member",
      text: "Thanks! Is there a good time when the squat racks are usually free?",
      time: "10:32 AM",
      createdAt: Date.now() - 1000 * 60 * 10,
    },
    {
      id: "umsg-4",
      sender: "gym",
      text: "Early mornings between 6–8 AM on weekdays are the quietest. Happy lifting!",
      time: "10:35 AM",
      createdAt: Date.now() - 1000 * 60 * 8,
    },
  ],
};

interface UserMessagesState {
  threads: GymMessageThread[];
  activeThreadId: string;
  setActiveThread: (id: string) => void;
  sendMessage: (threadId: string, text: string) => void;
  syncJoinedGym: (gymId: string | null, gymName: string | null) => void;
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
  const snippet = last.text.length > 48 ? `${last.text.slice(0, 48)}...` : last.text;
  return snippet;
}

export const useUserMessagesStore = create<UserMessagesState>()(
  persist(
    (set, get) => ({
      threads: [DEFAULT_THREAD],
      activeThreadId: DEFAULT_THREAD.id,

      setActiveThread: (id) => set({ activeThreadId: id }),

      sendMessage: (threadId, text) => {
        const trimmed = text.trim();
        if (!trimmed) return;

        const message: UserChatMessage = {
          id: `umsg-${Date.now()}`,
          sender: "member",
          text: trimmed,
          time: formatUserMessageTime(),
          createdAt: Date.now(),
        };

        set({
          threads: get().threads.map((thread) =>
            thread.id === threadId
              ? { ...thread, messages: [...thread.messages, message] }
              : thread,
          ),
        });
      },

      syncJoinedGym: (gymId, gymName) => {
        if (!gymId || !gymName) return;
        const threads = get().threads;
        const existing = threads.find((thread) => thread.gymId === gymId);
        if (existing) {
          set({ activeThreadId: existing.id });
          return;
        }
        const newThread: GymMessageThread = {
          ...DEFAULT_THREAD,
          id: `thread-${gymId}`,
          gymId,
          gymName,
        };
        set({
          threads: [newThread, ...threads],
          activeThreadId: newThread.id,
        });
      },
    }),
    {
      name: "fitfinder-user-messages",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

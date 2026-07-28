"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

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
  isOnline: boolean;
  messages: AdminSupportMessage[];
}

const DEFAULT_THREADS: OwnerSupportThread[] = [
  {
    id: "support-renz",
    ownerName: "Renz Aballe",
    ownerAvatarUrl:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80",
    gymName: "Abbsy Mini Gym",
    isOnline: true,
    messages: [
      {
        id: "amsg-1",
        sender: "owner",
        text: "Hi Admin, I need help setting up my Xendit account.",
        time: "10:30 AM",
        createdAt: Date.now() - 1000 * 60 * 20,
      },
      {
        id: "amsg-2",
        sender: "admin",
        text: "Hello Renz! Sure, what seems to be the issue?",
        time: "10:35 AM",
        createdAt: Date.now() - 1000 * 60 * 15,
      },
    ],
  },
  {
    id: "support-marcus",
    ownerName: "Marcus Johnson",
    ownerAvatarUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
    gymName: "Ironworks Gym",
    isOnline: false,
    messages: [
      {
        id: "amsg-3",
        sender: "owner",
        text: "Can you approve my new branch application?",
        time: "9:12 AM",
        createdAt: Date.now() - 1000 * 60 * 90,
      },
    ],
  },
];

function formatMessageTime(date = new Date()) {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function getOwnerThreadPreview(thread: OwnerSupportThread) {
  const last = thread.messages[thread.messages.length - 1];
  return last?.text ?? "No messages yet.";
}

interface AdminMessagesState {
  threads: OwnerSupportThread[];
  activeThreadId: string;
  setActiveThread: (id: string) => void;
  sendReply: (threadId: string, text: string) => void;
}

export const useAdminMessagesStore = create<AdminMessagesState>()(
  persist(
    (set, get) => ({
      threads: DEFAULT_THREADS,
      activeThreadId: DEFAULT_THREADS[0]?.id ?? "",

      setActiveThread: (id) => set({ activeThreadId: id }),

      sendReply: (threadId, text) => {
        const trimmed = text.trim();
        if (!trimmed) return;

        const message: AdminSupportMessage = {
          id: `amsg-${Date.now()}`,
          sender: "admin",
          text: trimmed,
          time: formatMessageTime(),
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
    }),
    {
      name: "fitfinder-admin-messages",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

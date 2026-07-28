"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import api from "@/lib/api";

export type AiMessageSender = "user" | "assistant";

export interface AiChatMessage {
  id: string;
  sender: AiMessageSender;
  text: string;
  createdAt: number;
}

function buildWelcomeMessage(firstName: string): AiChatMessage {
  return {
    id: "ai-welcome",
    sender: "assistant",
    text: `Hi ${firstName}! I'm your GymOS AI Assistant powered by Gemini, focused on fitness. Ask me about workouts, nutrition, recovery, or anything gym-related.`,
    createdAt: Date.now() - 1000 * 60 * 5,
  };
}

interface UserAiState {
  messages: AiChatMessage[];
  initializedFor: string | null;
  initialize: (firstName: string) => void;
  sendMessage: (text: string) => Promise<void>;
}

export const useUserAiStore = create<UserAiState>()(
  persist(
    (set, get) => ({
      messages: [],
      initializedFor: null,

      initialize: (firstName) => {
        const name = firstName.trim() || "there";
        if (get().initializedFor === name && get().messages.length > 0) return;
        set({
          initializedFor: name,
          messages: [buildWelcomeMessage(name)],
        });
      },

      sendMessage: async (text) => {
        const trimmed = text.trim();
        if (!trimmed) return;

        const userMessage: AiChatMessage = {
          id: `ai-user-${Date.now()}`,
          sender: "user",
          text: trimmed,
          createdAt: Date.now(),
        };

        set((state) => ({ messages: [...state.messages, userMessage] }));

        try {
          const { data } = await api.post("/user/ai-chat", { message: trimmed });
          if (data.success && data.data?.reply) {
            const reply: AiChatMessage = {
              id: `ai-assistant-${Date.now()}`,
              sender: "assistant",
              text: data.data.reply,
              createdAt: Date.now(),
            };
            set((state) => ({ messages: [...state.messages, reply] }));
            return;
          }
        } catch (error) {
          console.error("AI chat error:", error);
        }

        // Fallback
        window.setTimeout(() => {
          const reply: AiChatMessage = {
            id: `ai-assistant-${Date.now()}`,
            sender: "assistant",
            text: "Great question! I can help with workout plans, nutrition basics, recovery habits, and gym-related guidance. Tell me your goal and I'll suggest a simple next step.",
            createdAt: Date.now(),
          };
          set((state) => ({ messages: [...state.messages, reply] }));
        }, 700);
      },
    }),
    {
      name: "fitfinder-user-ai",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

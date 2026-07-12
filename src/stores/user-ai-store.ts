"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

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

function mockAssistantReply(prompt: string): string {
  const lower = prompt.toLowerCase();
  if (lower.includes("workout") || lower.includes("exercise") || lower.includes("train")) {
    return "For balanced progress, aim for 3–4 strength sessions per week with compound lifts like squats, presses, and rows. Add 1–2 cardio or mobility days for recovery.";
  }
  if (lower.includes("nutrition") || lower.includes("protein") || lower.includes("diet")) {
    return "A practical starting point is 1.6–2.2g of protein per kg of body weight daily, plus whole foods around your training window. Stay consistent before optimizing supplements.";
  }
  if (lower.includes("recovery") || lower.includes("rest") || lower.includes("sleep")) {
    return "Recovery is where gains happen. Target 7–9 hours of sleep, hydrate well, and schedule at least one full rest day. Light walking and stretching help too.";
  }
  return "Great question! I can help with workout plans, nutrition basics, recovery habits, and gym-related guidance. Tell me your goal and I'll suggest a simple next step.";
}

interface UserAiState {
  messages: AiChatMessage[];
  initializedFor: string | null;
  initialize: (firstName: string) => void;
  sendMessage: (text: string) => void;
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

      sendMessage: (text) => {
        const trimmed = text.trim();
        if (!trimmed) return;

        const userMessage: AiChatMessage = {
          id: `ai-user-${Date.now()}`,
          sender: "user",
          text: trimmed,
          createdAt: Date.now(),
        };

        set((state) => ({ messages: [...state.messages, userMessage] }));

        window.setTimeout(() => {
          const reply: AiChatMessage = {
            id: `ai-assistant-${Date.now()}`,
            sender: "assistant",
            text: mockAssistantReply(trimmed),
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

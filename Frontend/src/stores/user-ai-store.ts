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

export interface AiConversation {
  id: string;
  title: string;
  messages: AiChatMessage[];
  createdAt: number;
  updatedAt: number;
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
  conversations: Record<string, AiConversation>;
  activeConversationId: string | null;
  initializedFor: string | null;
  messages?: AiChatMessage[]; // For migration only

  initialize: (firstName: string) => void;
  createConversation: (firstName: string) => string;
  switchConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  sendMessage: (text: string, firstName: string) => Promise<void>;
}

export const useUserAiStore = create<UserAiState>()(
  persist(
    (set, get) => ({
      conversations: {},
      activeConversationId: null,
      initializedFor: null,

      initialize: (firstName) => {
        const name = firstName.trim() || "there";
        const state = get();
        
        let { conversations, activeConversationId } = state;
        
        // Migrate old `messages` state if it exists
        if (state.messages && state.messages.length > 0 && Object.keys(conversations).length === 0) {
          const id = `conv-${Date.now()}`;
          conversations = {
            [id]: {
              id,
              title: "Previous Chat",
              messages: state.messages,
              createdAt: state.messages[0]?.createdAt || Date.now(),
              updatedAt: state.messages[state.messages.length - 1]?.createdAt || Date.now()
            }
          };
          activeConversationId = id;
          set({ conversations, activeConversationId, messages: undefined }); 
        }

        if (state.initializedFor === name && Object.keys(conversations).length > 0) return;
        
        // Initialize if empty
        if (Object.keys(conversations).length === 0) {
          const id = `conv-${Date.now()}`;
          set({
            initializedFor: name,
            activeConversationId: id,
            conversations: {
              [id]: {
                id,
                title: "New Chat",
                messages: [buildWelcomeMessage(name)],
                createdAt: Date.now(),
                updatedAt: Date.now(),
              }
            }
          });
        } else {
          set({ initializedFor: name });
        }
      },

      createConversation: (firstName) => {
        const id = `conv-${Date.now()}`;
        set((state) => ({
          activeConversationId: id,
          conversations: {
            ...state.conversations,
            [id]: {
              id,
              title: "New Chat",
              messages: [buildWelcomeMessage(firstName)],
              createdAt: Date.now(),
              updatedAt: Date.now(),
            }
          }
        }));
        return id;
      },

      switchConversation: (id) => {
        if (get().conversations[id]) {
          set({ activeConversationId: id });
        }
      },

      deleteConversation: (id) => {
        set((state) => {
          const newConvs = { ...state.conversations };
          delete newConvs[id];
          
          let nextActive = state.activeConversationId;
          if (nextActive === id) {
            const keys = Object.keys(newConvs).sort((a,b) => newConvs[b].updatedAt - newConvs[a].updatedAt);
            nextActive = keys.length > 0 ? keys[0] : null;
          }
          
          return {
            conversations: newConvs,
            activeConversationId: nextActive
          };
        });
      },

      sendMessage: async (text, firstName) => {
        const trimmed = text.trim();
        if (!trimmed) return;

        let activeId = get().activeConversationId;
        
        if (!activeId || !get().conversations[activeId]) {
          activeId = get().createConversation(firstName);
        }

        const userMessage: AiChatMessage = {
          id: `ai-user-${Date.now()}`,
          sender: "user",
          text: trimmed,
          createdAt: Date.now(),
        };

        set((state) => {
          const conv = state.conversations[activeId!];
          const isFirstUserMessage = conv.messages.filter(m => m.sender === 'user').length === 0;
          let newTitle = conv.title;
          if (isFirstUserMessage) {
            newTitle = trimmed.length > 30 ? trimmed.substring(0, 30) + '...' : trimmed;
          }
          
          return {
            conversations: {
              ...state.conversations,
              [activeId!]: {
                ...conv,
                title: newTitle,
                messages: [...conv.messages, userMessage],
                updatedAt: Date.now()
              }
            }
          };
        });

        try {
          const { data } = await api.post("/user/ai-chat", { message: trimmed });
          if (data.success && data.data?.reply) {
            const reply: AiChatMessage = {
              id: `ai-assistant-${Date.now()}`,
              sender: "assistant",
              text: data.data.reply,
              createdAt: Date.now(),
            };
            set((state) => {
              const conv = state.conversations[activeId!];
              return {
                conversations: {
                  ...state.conversations,
                  [activeId!]: {
                    ...conv,
                    messages: [...conv.messages, reply],
                    updatedAt: Date.now()
                  }
                }
              };
            });
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
          set((state) => {
            const conv = state.conversations[activeId!];
            return {
              conversations: {
                ...state.conversations,
                [activeId!]: {
                  ...conv,
                  messages: [...conv.messages, reply],
                  updatedAt: Date.now()
                }
              }
            };
          });
        }, 700);
      },
    }),
    {
      name: "fitfinder-user-ai",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

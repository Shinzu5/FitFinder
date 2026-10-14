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
  sending: boolean;

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
      sending: false,

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
        const trimmed = text.trim().slice(0, 2000);
        if (!trimmed) return;

        let activeId = get().activeConversationId;

        if (!activeId || !get().conversations[activeId]) {
          activeId = get().createConversation(firstName);
        }

        set({ sending: true });

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
          // Send recent client history so short follow-ups stay in context
          // even when the server restarted (its memory is in-process only).
          // Kept short (last 8, truncated): long history + long questions
          // is the main cause of slow replies on production.
          const historyPayload = get()
            .conversations[activeId!].messages.slice(-8)
            .map((m) => ({ role: m.sender, text: m.text.slice(0, 800) }));
          const { data } = await api.post(
            "/user/ai-chat",
            {
              message: trimmed,
              history: historyPayload,
            },
            { timeout: 20000 },
          );
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
                sending: false,
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
          set({ sending: false });
        } catch (error) {
          console.error("AI chat error:", error);
          const code = (error as { code?: string })?.code;
          if (code === "ECONNABORTED") {
            const reply: AiChatMessage = {
              id: `ai-assistant-${Date.now()}`,
              sender: "assistant",
              text: "That took too long — the AI is busy right now. Please try again with a shorter question in a few seconds.",
              createdAt: Date.now(),
            };
            set((state) => {
              const conv = state.conversations[activeId!];
              if (!conv) return { sending: false };
              return {
                sending: false,
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
      // `sending` is transient UI state — never persist it, or a reload
      // mid-request would restore a stuck loading indicator.
      partialize: (state) => {
        const { sending: _sending, ...rest } = state;
        return rest;
      },
    },
  ),
);

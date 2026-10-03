import type { ChatTurn } from "@/types/ai";

/** In-memory recent turns per user (no AI chat table in schema). */
export const AiChatHistory = new Map<string, ChatTurn[]>();

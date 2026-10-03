import { AiChatHistory } from "@/services/ai/ai-history-state";

/** Clear server-side history for a user (optional utility). */
export function ClearAiHistoryService(userId: string): void {
  AiChatHistory.delete(userId);
}

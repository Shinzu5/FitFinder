import {
  detectLanguage,
  languageHintForPrompt,
  outOfScopeMessage,
} from "./languageDetector";
import { validatePrompt, type ChatTurn } from "./promptValidator";
import { generateWithGemini, type GeminiTurn } from "./geminiClient";

/** In-memory recent turns per user (no AI chat table in schema). */
const MAX_TURNS = 16;
const historyByUser = new Map<string, ChatTurn[]>();

function getHistory(userId?: string): ChatTurn[] {
  if (!userId) return [];
  return historyByUser.get(userId) || [];
}

function appendHistory(userId: string | undefined, userText: string, assistantText: string) {
  if (!userId) return;
  const prev = getHistory(userId);
  const next = [
    ...prev,
    { role: "user" as const, text: userText },
    { role: "assistant" as const, text: assistantText },
  ].slice(-MAX_TURNS);
  historyByUser.set(userId, next);
}

function toGeminiHistory(turns: ChatTurn[]): GeminiTurn[] {
  return turns.map((t) => ({
    role: t.role === "assistant" ? "model" : "user",
    text: t.text,
  }));
}

function normalizeIncomingHistory(raw: unknown): ChatTurn[] {
  if (!Array.isArray(raw)) return [];
  const out: ChatTurn[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const role = (item as { role?: string; sender?: string }).role
      || (item as { sender?: string }).sender;
    const text = String((item as { text?: string; message?: string }).text
      || (item as { message?: string }).message
      || "").trim();
    if (!text) continue;
    if (role === "user" || role === "assistant") {
      out.push({ role, text });
    } else if (role === "model") {
      out.push({ role: "assistant", text });
    }
  }
  return out.slice(-MAX_TURNS);
}

export type AiChatOptions = {
  userId?: string;
  /** Optional client history; merged with server memory when provided. */
  history?: unknown;
};

/**
 * FitFinder AI Assistant entrypoint.
 * Validates scope → refuses without Gemini when out of scope →
 * otherwise calls Gemini with short prompt + recent history.
 */
export async function generateAiResponse(
  message: string,
  options: AiChatOptions = {},
): Promise<string> {
  const trimmed = String(message || "").trim();
  const lang = detectLanguage(trimmed);

  const clientHistory = normalizeIncomingHistory(options.history);
  const memoryHistory = getHistory(options.userId);
  // Prefer richer of the two (client localStorage vs server memory)
  const history =
    clientHistory.length >= memoryHistory.length ? clientHistory : memoryHistory;

  const validation = validatePrompt(trimmed, history);
  if (!validation.ok) {
    if (validation.reason === "empty") {
      return lang === "fil"
        ? "Magtanong ka lang tungkol sa fitness o nutrisyon."
        : lang === "ceb"
          ? "Pangutana lang bahin sa fitness o nutrisyon."
          : "Please ask a fitness or nutrition question.";
    }
    const refusal = outOfScopeMessage(lang);
    appendHistory(options.userId, trimmed, refusal);
    return refusal;
  }

  try {
    const reply = await generateWithGemini({
      systemExtra: languageHintForPrompt(lang),
      history: toGeminiHistory(history),
      userMessage: trimmed,
    });

    if (reply == null) {
      return "The AI Assistant is currently unavailable (missing API key).";
    }

    appendHistory(options.userId, trimmed, reply);
    return reply;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return lang === "fil"
      ? "May problema sa koneksyon. Subukan ulit mamaya."
      : lang === "ceb"
        ? "Adunay problema sa koneksyon. Sulayi pag-usab unya."
        : "I'm having trouble connecting right now. Please try again later.";
  }
}

/** Clear server-side history for a user (optional utility). */
export function clearAiHistory(userId: string): void {
  historyByUser.delete(userId);
}

import { GoogleGenerativeAI, type Content } from "@google/generative-ai";
import { env } from "@/config/env";
import type { GeminiTurn } from "@/types/ai";

const SHORT_SYSTEM = `FitFinder fitness coach. Topics only: fitness, gym, workouts, exercise, bodybuilding, weight loss/gain, muscle, nutrition, meals, general supplements, healthy lifestyle, equipment, injury prevention, recovery, cardio, strength, flexibility. Refuse other topics briefly. No medical diagnosis/meds. Match the user's language. Be concise.`;

let client: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI | null {
  const key = env.GEMINI_API_KEY?.trim();
  if (!key || key === "YOUR_GEMINI_API_KEY") return null;
  if (!client) client = new GoogleGenerativeAI(key);
  return client;
}

/** Fallbacks when the configured model is retired (404). Overload /
 * rate-limit errors (429/503) fail fast instead of chaining slow retries. */
const FALLBACK_MODELS = ["gemini-3.5-flash", "gemini-3.1-flash-lite"];

function statusOf(error: unknown): number | undefined {
  const status = (error as { status?: unknown })?.status;
  return typeof status === "number" ? status : undefined;
}

/** True for transient errors worth retrying (rate limit / overload / server hiccup). */
export function isRetryableGeminiError(error: unknown): boolean {
  const status = statusOf(error);
  return status === 429 || status === 500 || status === 503;
}

/** True when every attempt failed because the API was busy (not a key/config problem). */
export function isOverloadedGeminiError(error: unknown): boolean {
  const status = statusOf(error);
  return status === 429 || status === 503;
}

/** Convert chat turns to Gemini contents (user/model alternating). */
export function toGeminiContents(turns: GeminiTurn[]): Content[] {
  return turns
    .filter((t) => t.text.trim())
    .map((t) => ({
      role: t.role,
      parts: [{ text: t.text.trim() }],
    }));
}

/**
 * Call Gemini with a short system prompt + limited history.
 * Returns null when the API key is missing.
 * Single attempt per model with fail-fast on overload (429/503): falls back
 * to an alternate model only when the configured one is retired (404).
 * Throws the last error when every model fails.
 */
export async function generateWithGemini(opts: {
  systemExtra?: string;
  history: GeminiTurn[];
  userMessage: string;
}): Promise<string | null> {
  const genAI = getClient();
  if (!genAI) return null;

  const systemInstruction = opts.systemExtra
    ? `${SHORT_SYSTEM}\n${opts.systemExtra}`
    : SHORT_SYSTEM;

  // Keep only recent turns to reduce tokens (long questions + long history
  // is the main cause of slow replies on production)
  const recent = opts.history.slice(-6).map((t) => ({
    ...t,
    text: t.text.slice(0, 800),
  }));
  const contents = toGeminiContents([
    ...recent,
    { role: "user", text: opts.userMessage.slice(0, 2000) },
  ]);

  const generationConfig = {
    temperature: env.AI_TEMPERATURE,
    // Cap output: long essays are the other half of slow replies.
    // The system prompt already asks for concise answers.
    maxOutputTokens: Math.min(env.AI_MAX_TOKENS, 400),
  };

  const models = [
    env.GEMINI_MODEL,
    ...FALLBACK_MODELS.filter((m) => m !== env.GEMINI_MODEL),
  ];

  let lastError: unknown = null;
  for (const modelName of models) {
    // Single attempt per model — fail fast. Chaining retries across 3 models
    // turned one slow call into a ~22s hang on production (see ai-chat 21.78s).
    // Only fall through on 404 (retired model name); overload/rate-limit
    // (429/503/500) returns the "busy, try again" message immediately.
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction,
      });
      const result = await model.generateContent({
        contents,
        generationConfig,
      });
      const text = result.response.text()?.trim();
      return text || "I couldn't generate a reply. Please try again.";
    } catch (error) {
      lastError = error;
      console.error(`Gemini API Error (model=${modelName} attempt=1/1):`, error);
      if (statusOf(error) !== 404) break;
    }
  }

  throw lastError;
}

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

/** Fallbacks for when the configured model is overloaded (503) or retired (404). */
const FALLBACK_MODELS = ["gemini-flash-latest", "gemini-3-flash-preview"];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
 * Retries transient (429/500/503) errors and falls back to alternate
 * models when the configured one is overloaded or retired.
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

  // Keep only recent turns to reduce tokens
  const recent = opts.history.slice(-8);
  const contents = toGeminiContents([
    ...recent,
    { role: "user", text: opts.userMessage },
  ]);

  const generationConfig = {
    temperature: env.AI_TEMPERATURE,
    maxOutputTokens: Math.min(env.AI_MAX_TOKENS, 768),
  };

  const models = [
    env.GEMINI_MODEL,
    ...FALLBACK_MODELS.filter((m) => m !== env.GEMINI_MODEL),
  ];

  let lastError: unknown = null;
  for (const modelName of models) {
    // Primary model gets 2 attempts (transient 503s are common on *-latest
    // aliases); fallbacks get 1 attempt each to bound total latency.
    const maxAttempts = modelName === models[0] ? 2 : 1;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
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
        console.error(
          `Gemini API Error (model=${modelName} attempt=${attempt}/${maxAttempts}):`,
          error,
        );
        if (isRetryableGeminiError(error) && attempt < maxAttempts) {
          await sleep(800 * attempt);
          continue;
        }
        break;
      }
    }
  }

  throw lastError;
}

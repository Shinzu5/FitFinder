import { GoogleGenerativeAI, type Content } from "@google/generative-ai";
import { env } from "../../config/env";

export type GeminiTurn = { role: "user" | "model"; text: string };

const SHORT_SYSTEM = `FitFinder fitness coach. Topics only: fitness, gym, workouts, exercise, bodybuilding, weight loss/gain, muscle, nutrition, meals, general supplements, healthy lifestyle, equipment, injury prevention, recovery, cardio, strength, flexibility. Refuse other topics briefly. No medical diagnosis/meds. Match the user's language. Be concise.`;

let client: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI | null {
  const key = env.GEMINI_API_KEY?.trim();
  if (!key || key === "YOUR_GEMINI_API_KEY") return null;
  if (!client) client = new GoogleGenerativeAI(key);
  return client;
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

  const model = genAI.getGenerativeModel({
    model: env.GEMINI_MODEL,
    systemInstruction,
  });

  // Keep only recent turns to reduce tokens
  const recent = opts.history.slice(-8);
  const contents = toGeminiContents([
    ...recent,
    { role: "user", text: opts.userMessage },
  ]);

  const result = await model.generateContent({
    contents,
    generationConfig: {
      temperature: env.AI_TEMPERATURE,
      maxOutputTokens: Math.min(env.AI_MAX_TOKENS, 768),
    },
  });

  const text = result.response.text()?.trim();
  return text || "I couldn't generate a reply. Please try again.";
}

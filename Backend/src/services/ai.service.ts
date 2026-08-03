import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../config/env";

const FITNESS_KEYWORDS = [
  "workout", "exercise", "train", "fitness", "gym",
  "nutrition", "protein", "diet", "calorie", "meal", "food",
  "recovery", "rest", "sleep", "stretch", "hydrate", "water",
  "equipment", "bench", "treadmill", "squat", "dumbbell", "machine", "band",
  "membership", "join", "cancel", "renew", "price", "cost", "fee", "rule", "etiquette",
  "muscle", "weight", "fat", "cardio", "hiit", "strength", "push", "pull", "legs",
  "warm", "cool", "injury", "plan", "program"
];

function isFitnessRelated(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  for (const keyword of FITNESS_KEYWORDS) {
    if (lowerMessage.includes(keyword)) {
      return true;
    }
  }
  return false;
}

const systemPrompt = `You are the FitFinder AI Assistant.
Your purpose is to help users with fitness, exercise, nutrition, healthy lifestyles, gym equipment, and gym memberships.
Do not answer unrelated questions.
If a question is outside your supported domain, politely explain that you only provide fitness-related assistance and invite the user to ask another fitness question.
Never invent gym policies, prices, schedules, or membership information.
Never provide medical diagnoses or prescribe medication.
Recommend consulting a qualified healthcare professional for medical concerns.
Keep responses accurate, practical, friendly, concise, and easy to understand.`;

/** Fitness-domain gate → Gemini generation → assistant reply (rejects off-topic questions). */
export async function generateAiResponse(message: string): Promise<string> {
  const trimmed = message.trim();
  if (!trimmed) {
    return "Please provide a question.";
  }

  // Domain restriction check
  if (!isFitnessRelated(trimmed)) {
    return "I'm the FitFinder AI Assistant, and I'm designed to help with fitness, workouts, nutrition, gym memberships, equipment, and healthy living. I can't answer questions outside those topics. Feel free to ask me anything related to your fitness journey.";
  }

  try {
    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY") {
      return "The AI Assistant is currently unavailable (missing API key).";
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: env.GEMINI_MODEL,
      systemInstruction: systemPrompt,
    });

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: trimmed }] }],
      generationConfig: {
        temperature: env.AI_TEMPERATURE,
        maxOutputTokens: env.AI_MAX_TOKENS,
      },
    });

    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "I'm having trouble connecting right now. Please try again later.";
  }
}

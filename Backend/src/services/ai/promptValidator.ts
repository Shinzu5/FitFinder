/**
 * Pre-Gemini domain gate for FitFinder AI.
 * In-scope → allow Gemini. Out-of-scope → block (no API call).
 */

const FITNESS_TERMS = [
  // English
  "fitness",
  "gym",
  "workout",
  "work out",
  "exercise",
  "exercises",
  "training",
  "train",
  "bodybuilding",
  "body building",
  "weight loss",
  "lose weight",
  "weight gain",
  "gain weight",
  "muscle",
  "muscles",
  "hypertrophy",
  "nutrition",
  "diet",
  "calorie",
  "calories",
  "protein",
  "carb",
  "carbs",
  "fat",
  "meal",
  "meals",
  "meal plan",
  "supplement",
  "supplements",
  "creatine",
  "whey",
  "healthy",
  "lifestyle",
  "equipment",
  "dumbbell",
  "barbell",
  "treadmill",
  "machine",
  "injury",
  "injuries",
  "prevention",
  "recovery",
  "rest day",
  "sleep",
  "stretch",
  "stretching",
  "flexibility",
  "mobility",
  "cardio",
  "hiit",
  "strength",
  "powerlifting",
  "squat",
  "deadlift",
  "bench",
  "press",
  "reps",
  "sets",
  "warmup",
  "warm up",
  "cool down",
  "cooldown",
  "form",
  "technique",
  "personal trainer",
  "bulk",
  "cut",
  "lean",
  "abs",
  "core",
  "legs",
  "chest",
  "back",
  "shoulders",
  "arms",
  "glutes",
  "hydrate",
  "hydration",
  "macros",
  "micro",
  "bmi",
  "body fat",
  "plank",
  "push up",
  "pushup",
  "pull up",
  "pullup",
  "yoga",
  "pilates",
  "crossfit",
  // Filipino / Tagalog
  "ehersisyo",
  "pagsasanay",
  "pag-eehersisyo",
  "pag eehersisyo",
  "pagiging malusog",
  "malusog",
  "nutrisyon",
  "pagkain",
  "diyeta",
  "timbang",
  "pumayat",
  "tumaba",
  "kalusugan",
  "bihis",
  "kagamitan",
  "samahan",
  "muscular",
  "lakas",
  "cardio",
  // Cebuano
  "ehersisyo",
  "pag-ehersisyo",
  "pag ehersisyo",
  "himsog",
  "lawas",
  "pagkaon",
  "timbang",
  "kusog",
  "bicep",
  "tricep",
];

const GREETING_RE =
  /^(hi|hello|hey|yo|sup|good\s*(morning|afternoon|evening)|kumusta|kamusta|maayong\s*(buntag|hapon|gabi|adlaw)|salamat|thanks|thank you|ty)[\s!.?]*$/i;

const FOLLOW_UP_RE =
  /^(yes|no|ok|okay|sure|more|again|continue|next|ano\s*pa|unsa\s*pa|ug\s*unsa|and\s*then|how\s*many|how\s*much|sets?|reps?|times?|weeks?|days?|please|pwede|puwede|sige|oo|opo|dili|hindi)\b/i;

/** Clear off-topic signals — never send these to Gemini. */
const OFF_TOPIC_RE =
  /\b(politic|election|president|crypto|bitcoin|stock|homework|essay|code|programming|javascript|python|java\b|hack|malware|weapon|gun|drug|porn|sex|dating|boyfriend|girlfriend|movie|netflix|celebrity|gossip|weather|joke|riddle|math problem|solve for|capital of|who won|nba score|football score)\b/i;

export type ChatTurn = { role: "user" | "assistant"; text: string };

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function hasFitnessTerm(text: string): boolean {
  const n = normalize(text);
  return FITNESS_TERMS.some((term) => n.includes(term));
}

/** True when recent turns were already about fitness (allows short follow-ups). */
function recentContextIsFitness(history: ChatTurn[]): boolean {
  const recent = history.slice(-6);
  if (recent.length === 0) return false;
  return recent.some((t) => hasFitnessTerm(t.text));
}

/**
 * Validate user message before calling Gemini.
 * Returns { ok: true } when in scope, else { ok: false }.
 */
export function validatePrompt(
  message: string,
  history: ChatTurn[] = [],
): { ok: true } | { ok: false; reason: "empty" | "out_of_scope" } {
  const trimmed = message.trim();
  if (!trimmed) return { ok: false, reason: "empty" };

  if (OFF_TOPIC_RE.test(trimmed) && !hasFitnessTerm(trimmed)) {
    return { ok: false, reason: "out_of_scope" };
  }

  if (GREETING_RE.test(trimmed)) return { ok: true };

  if (hasFitnessTerm(trimmed)) return { ok: true };

  // Short follow-ups after an in-scope thread only
  if (
    recentContextIsFitness(history) &&
    (FOLLOW_UP_RE.test(trimmed) || trimmed.split(/\s+/).length <= 12)
  ) {
    return { ok: true };
  }

  return { ok: false, reason: "out_of_scope" };
}

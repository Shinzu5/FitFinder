/**
 * Pre-Gemini domain gate for FitFinder AI.
 * In-scope → allow Gemini. Out-of-scope → block (no API call).
 */

import type { ChatTurn } from "@/types/ai";

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
  "chin up",
  "chinup",
  "dip",
  "dips",
  "lunge",
  "lunges",
  "burpee",
  "burpees",
  "yoga",
  "pilates",
  "crossfit",
  "calisthenics",
  "plyometric",
  "tabata",
  "emom",
  "amrap",
  "circuit",
  "superset",
  "dropset",
  "drop set",
  // Food / eating (common beginner phrasing: "what food should I eat?")
  // NOTE: short food words (eat/ate/rice/oats/…) live in FITNESS_WORDS below
  // with word-boundary matching — substring matching would misfire on
  // "great", "climate", "price", "boats", etc.
  "food",
  "foods",
  "breakfast",
  "lunch",
  "dinner",
  "brunch",
  "snack",
  "snacks",
  "appetite",
  "grocery",
  "groceries",
  "recipe",
  "recipes",
  "cooking",
  "vegan",
  "vegetarian",
  "keto",
  "paleo",
  "fasting",
  "intermittent fasting",
  "cheat meal",
  "junk food",
  "fast food",
  "pre-workout",
  "pre workout",
  "post-workout",
  "post workout",
  "oatmeal",
  "smoothie",
  "protein shake",
  "fiber",
  "sugar",
  "metabolism",
  "deficit",
  "surplus",
  "maintenance",
  "portion",
  "serving",
  "servings",
  // Body / measurement
  "weigh",
  "weighing",
  "scale",
  "belly",
  "thigh",
  "thighs",
  "quad",
  "quads",
  "hamstring",
  "hamstrings",
  "calf",
  "calves",
  "forearm",
  "forearms",
  "delt",
  "delts",
  "pecs",
  "lats",
  "hip thrust",
  "trap",
  "traps",
  "oblique",
  "obliques",
  "posture",
  "endurance",
  "stamina",
  "body composition",
  "recomposition",
  "shred",
  "shredded",
  "tone",
  "toned",
  "ripped",
  "gains",
  // Cardio / activity
  "jog",
  "jogging",
  "running",
  "runner",
  "walking",
  "swim",
  "swimming",
  "marathon",
  "sprint",
  "sprints",
  "step count",
  "heart rate",
  // Equipment / lifts
  "kettlebell",
  "resistance",
  "elliptical",
  "bench press",
  "leg press",
  "lat pulldown",
  "cable",
  "overhead",
  "incline",
  "decline",
  "deload",
  "overtraining",
  "plateau",
  "progressive overload",
  "full body",
  "upper body",
  "lower body",
  "push pull legs",
  "training split",
  "workout split",
  "gym routine",
  "workout routine",
  "exercise routine",
  "routine",
  "regimen",
  "beginner",
  "intermediate",
  "coach",
  "trainer",
  // Supplements / recovery
  "bcaa",
  "glutamine",
  "casein",
  "mass gainer",
  "fat burner",
  "multivitamin",
  "vitamin",
  "vitamins",
  "mineral",
  "minerals",
  "electrolyte",
  "electrolytes",
  "soreness",
  "cramp",
  "cramps",
  "sprain",
  "strain",
  "tendon",
  "tendonitis",
  "joint",
  "joints",
  "knee",
  "elbow",
  "wrist",
  "ankle",
  "lower back",
  "spine",
  "foam roller",
  "massage gun",
  "sauna",
  "ice bath",
  // Filipino / Tagalog ("pagkain" = food)
  "ehersisyo",
  "ulam",
  "kanin",
  "tubig",
  "katawan",
  "taba",
  "payat",
  "mataba",
  "pawis",
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
  // Cebuano ("pagkaon" = food)
  "ehersisyo",
  "kaon",
  "kaonon",
  "tambok",
  "niwang",
  "singot",
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

/**
 * Common fitness-question phrasings that carry no single keyword
 * (e.g. "I am a beginner, what food should I eat?").
 * Checked before refusing so plain-language questions reach Gemini,
 * which still refuses truly off-topic requests via the system prompt.
 */
const FITNESS_INTENT_RE =
  /\b(how\s+(do|can|should)\s+i\b.*(workout|exercise|train|lose|gain|eat|diet|muscle|weight|fat|gym|fitness|food|meal|routine|protein|cardio)|what\s+(should|can|do)\s+i\b.*(eat|do|take)|suggest\s+.*(food|meal|diet|workout|exercise|routine|plan)|recommend\s+.*(food|meal|diet|workout|exercise|routine)|step\s*by\s*step\s+(workout|exercise|training|routine)|beginner\s+(routine|workout|plan|guide|tips?)|give\s+me\s+.*(workout|routine|meal|diet))\b/i;

/** Clear off-topic signals — never send these to Gemini. */
const OFF_TOPIC_RE =
  /\b(politic|election|president|crypto|bitcoin|stock|homework|essay|exam|quiz|assignment|thesis|schoolwork|code|programming|javascript|python|java\b|hack|malware|weapon|gun|drug|porn|sex|dating|boyfriend|girlfriend|movie|netflix|celebrity|gossip|weather|joke|riddle|math problem|solve for|capital of|who won|nba score|football score)\b/i;

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Short words that must match whole-word only. Substring matching would
 * misfire badly here ("ate" ⊂ "climate", "eat" ⊂ "great",
 * "hip" ⊂ "relationship", "rowing" ⊂ "growing", "cycling" ⊂ "recycling").
 * ("rice" is deliberately excluded — "price of rice" questions are usually
 * off-topic, and real rice questions contain eat/meal/bulk anyway.)
 */
const FITNESS_WORDS = [
  "eat",
  "ate",
  "eats",
  "eaten",
  "eating",
  "food", // also a substring term; harmless duplication
  "oats",
  "curl",
  "curls",
  "lat",
  "pec",
  "hip",
  "hips",
  "cycle",
  "cycling",
  "rowing",
  "steps",
  "doms",
];

const FITNESS_WORD_RE = new RegExp(`\\b(${FITNESS_WORDS.join("|")})\\b`, "i");

function hasFitnessTerm(text: string): boolean {
  const n = normalize(text);
  if (FITNESS_WORD_RE.test(n)) return true;
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

  // Plain-language fitness questions without a single keyword
  // (e.g. "I am a beginner, what food should I eat?")
  if (FITNESS_INTENT_RE.test(trimmed)) return { ok: true };

  // Short follow-ups after an in-scope thread only
  if (
    recentContextIsFitness(history) &&
    (FOLLOW_UP_RE.test(trimmed) || trimmed.split(/\s+/).length <= 12)
  ) {
    return { ok: true };
  }

  return { ok: false, reason: "out_of_scope" };
}

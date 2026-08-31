export type SupportedLangHint = "en" | "fil" | "ceb" | "other";

const FIL_MARKERS =
  /\b(ang|mga|ako|ikaw|ninyo|kayo|opo|po|ba|nga|para|sa|ng|at|o|hindi|oo|paano|ano|magkano|pwede|puwede|gusto|kailangan|salamat|kumusta|eh|yung|yun|ito|iyan|iyan|lang|talaga|sana|naman|daw|raw|mag|nag|pag|may|meron|walang|wala)\b/i;

const CEB_MARKERS =
  /\b(ako|ikaw|ka|mo|nimo|nako|unya|unsa|asa|kinsa|ngano|palihug|salamat|maayong|adlaw|gabi|buntag|hapon|wala|naa|dili|oo|pud|usab|kay|ug|sa|og|nga|lang|gyud|gayud|kun|kung|pwede|gusto|kinahanglan)\b/i;

const EN_MARKERS =
  /\b(the|and|or|is|are|was|were|what|how|when|where|why|can|should|would|could|my|your|with|for|about|please|thanks|hello|hi)\b/i;

/**
 * Lightweight language hint (no Gemini call).
 * Used for out-of-scope replies and a short system hint.
 */
export function detectLanguage(text: string): SupportedLangHint {
  const t = text.trim();
  if (!t) return "en";

  const hasLatin = /[a-zA-Z]/.test(t);
  if (!hasLatin) return "other";

  const fil = (t.match(FIL_MARKERS) || []).length;
  const ceb = (t.match(CEB_MARKERS) || []).length;
  const en = (t.match(EN_MARKERS) || []).length;

  // Prefer Cebuano when its markers dominate Filipino shared words
  if (ceb >= 2 && ceb >= fil && ceb >= en) return "ceb";
  if (fil >= 2 && fil >= en) return "fil";
  if (en >= 1 && en >= fil && en >= ceb) return "en";
  if (ceb > 0 && ceb >= fil) return "ceb";
  if (fil > 0) return "fil";
  return hasLatin ? "en" : "other";
}

/** Localized fitness-only refusal — no Gemini. */
export function outOfScopeMessage(lang: SupportedLangHint): string {
  switch (lang) {
    case "fil":
      return "Pasensya na, masasagot ko lang ang mga tanong tungkol sa fitness, gym, ehersisyo, nutrisyon, at malusog na pamumuhay.";
    case "ceb":
      return "Pasayloa ko, tubagon ra nako ang mga pangutana bahin sa fitness, gym, ehersisyo, nutrisyon, ug himsog nga kinabuhi.";
    case "other":
      return "I'm sorry, I can only answer questions related to fitness, gyms, exercise, nutrition, and healthy living.";
    case "en":
    default:
      return "I'm sorry, I can only answer questions related to fitness, gyms, exercise, nutrition, and healthy living.";
  }
}

export function languageHintForPrompt(lang: SupportedLangHint): string {
  switch (lang) {
    case "fil":
      return "Reply in Filipino (Tagalog).";
    case "ceb":
      return "Reply in Cebuano.";
    case "other":
      return "Reply in the user's language.";
    case "en":
    default:
      return "Reply in English.";
  }
}

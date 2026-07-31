/** Server source of truth for owner platform subscription plans. */

export type OwnerPlanId = "starter" | "standard" | "popular";

export interface OwnerPlanDefinition {
  id: OwnerPlanId;
  name: string;
  price: number;
  /** Access duration in whole days */
  days: number;
}

export const OWNER_PLANS: OwnerPlanDefinition[] = [
  { id: "starter", name: "Starter", price: 200, days: 15 },
  { id: "standard", name: "Standard", price: 350, days: 30 },
  { id: "popular", name: "Popular", price: 500, days: 60 },
];

export function getOwnerPlanById(id: string | undefined | null): OwnerPlanDefinition | null {
  if (!id) return null;
  return OWNER_PLANS.find((p) => p.id === id) ?? null;
}

/** Resolve plan from payment metadata; prefer catalog over client-supplied price/days. */
export function resolveOwnerPlanFromMetadata(meta: Record<string, unknown>): OwnerPlanDefinition | null {
  const byId = getOwnerPlanById(String(meta.planId || ""));
  if (byId) return byId;

  const name = String(meta.planName || "").toLowerCase();
  const byName = OWNER_PLANS.find((p) => p.name.toLowerCase() === name);
  if (byName) return byName;

  // Legacy: months-based metadata (1 month = 30 days)
  const months = Number(meta.months);
  const days = Number(meta.days ?? meta.durationDays);
  if (Number.isFinite(days) && days > 0) {
    const match = OWNER_PLANS.find((p) => p.days === days);
    if (match) return match;
  }
  if (Number.isFinite(months) && months > 0 && months <= 12) {
    const asDays = Math.round(months) * 30;
    const match = OWNER_PLANS.find((p) => p.days === asDays);
    if (match) return match;
  }

  return null;
}

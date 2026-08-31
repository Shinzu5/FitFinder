export type OwnerPlanId = "starter" | "standard" | "popular";

export interface OwnerPlan {
  id: OwnerPlanId;
  name: string;
  description: string;
  price: number;
  periodLabel: string;
  /** Access duration in whole days */
  days: number;
  gymSlots: number;
  accent: "white" | "yellow" | "teal";
  badge?: string;
  badgeTone?: "yellow" | "teal";
}

export const OWNER_PLANS: OwnerPlan[] = [
  {
    id: "starter",
    name: "Starter",
    description: "1 gym · 15-day access · get started fast",
    price: 200,
    periodLabel: "for 15 days",
    days: 15,
    gymSlots: 1,
    accent: "white",
  },
  {
    id: "standard",
    name: "Standard",
    description: "1 gym · 30-day access · full features",
    price: 350,
    periodLabel: "for 30 days",
    days: 30,
    gymSlots: 1,
    accent: "teal",
  },
  {
    id: "popular",
    name: "Popular",
    description: "1 gym · 60-day access · best value",
    price: 500,
    periodLabel: "for 60 days",
    days: 60,
    gymSlots: 1,
    accent: "yellow",
    badge: "★ MOST POPULAR",
    badgeTone: "yellow",
  },
];

export function getOwnerPlan(id: OwnerPlanId | string) {
  return OWNER_PLANS.find((plan) => plan.id === id) ?? OWNER_PLANS[1];
}

export function formatPlanPrice(price: number) {
  return price.toLocaleString("en-PH");
}

export function getAccessUntilDate(days: number, from = new Date()) {
  const date = new Date(from);
  const d = Number(days);
  date.setDate(date.getDate() + (Number.isFinite(d) && d > 0 ? Math.round(d) : 30));
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatValidUntilIso(iso: string | null | undefined) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Normalize DB duration (legacy months 1–12 or current days 15/30/60). */
export function storedDurationToDays(stored: number | null | undefined): number | null {
  if (typeof stored !== "number" || !Number.isFinite(stored) || stored <= 0) return null;
  if (stored <= 12) return Math.round(stored) * 30;
  return Math.round(stored);
}

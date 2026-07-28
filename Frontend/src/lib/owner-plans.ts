export type OwnerPlanId = "starter" | "standard" | "pro";

export interface OwnerPlan {
  id: OwnerPlanId;
  name: string;
  description: string;
  price: number;
  periodLabel: string;
  months: number;
  gymSlots: number;
  accent: "white" | "yellow" | "teal";
  badge?: string;
  badgeTone?: "yellow" | "teal";
}

export const OWNER_PLANS: OwnerPlan[] = [
  {
    id: "starter",
    name: "Starter",
    description: "1 gym · monthly · up to 3 coaches",
    price: 299,
    periodLabel: "per month",
    months: 1,
    gymSlots: 1,
    accent: "white",
  },
  {
    id: "standard",
    name: "Standard",
    description: "1 gym · 3-month access · up to 10 coaches",
    price: 699,
    periodLabel: "per 3 months",
    months: 3,
    gymSlots: 1,
    accent: "yellow",
    badge: "★ MOST POPULAR",
    badgeTone: "yellow",
  },
  {
    id: "pro",
    name: "Pro",
    description: "Unlimited gyms · monthly · all features",
    price: 1499,
    periodLabel: "per month",
    months: 1,
    gymSlots: 999,
    accent: "teal",
    badge: "↑ PRO",
    badgeTone: "teal",
  },
];

export function getOwnerPlan(id: OwnerPlanId) {
  return OWNER_PLANS.find((plan) => plan.id === id) ?? OWNER_PLANS[1];
}

export function formatPlanPrice(price: number) {
  return price.toLocaleString("en-PH");
}

export function getAccessUntilDate(months: number, from = new Date()) {
  const date = new Date(from);
  date.setMonth(date.getMonth() + months);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

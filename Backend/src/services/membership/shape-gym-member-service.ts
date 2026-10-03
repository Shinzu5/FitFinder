import type { MembershipStatus } from "@prisma/client";

function billingCycleFromDays(durationDays: number): "Monthly" | "Quarterly" | "Yearly" {
  if (durationDays <= 31) return "Monthly";
  if (durationDays <= 100) return "Quarterly";
  return "Yearly";
}

function displayMemberType(memberType: string, paymentMethod: string): "Walk-in" | "Online" {
  if (memberType === "ONLINE") return "Online";
  if (memberType === "WALK_IN") return "Walk-in";
  const method = paymentMethod.toUpperCase();
  if (method === "XENDIT" || method === "CASHLESS") return "Online";
  return "Walk-in";
}

function displayRegisteredBy(registeredBy: string): "Owner" | "Clerk" | "Self" {
  if (registeredBy === "OWNER") return "Owner";
  if (registeredBy === "CLERK") return "Clerk";
  return "Self";
}

export function ShapeGymMemberService(m: {
  id: string;
  planName: string;
  planPrice: number;
  durationDays: number;
  totalPaid: number;
  status: MembershipStatus | string;
  memberType: string;
  registeredBy: string;
  paymentMethod: string;
  startsAt: Date;
  joinedAt: Date;
  expiresAt: Date;
  user: { fullName: string; email: string };
  plan?: { name: string; price?: number; durationDays?: number } | null;
}) {
  const totalDays = m.durationDays || m.plan?.durationDays || 0;
  const remainingDays = Math.max(
    0,
    Math.ceil((m.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
  );
  const expired =
    String(m.status).toUpperCase() === "EXPIRED" || remainingDays === 0;
  const status = expired
    ? "expired"
    : remainingDays <= 5
      ? "expiring"
      : "active";

  const planName = m.planName || m.plan?.name || "Plan";
  const planPrice = m.planPrice > 0 ? m.planPrice : m.plan?.price ?? 0;
  const nameParts = m.user.fullName.trim().split(/\s+/);
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ");

  return {
    id: m.id,
    fullName: m.user.fullName,
    firstName,
    lastName,
    email: m.user.email,
    memberType: displayMemberType(m.memberType, m.paymentMethod),
    planName,
    plan: planName,
    planPrice,
    billingCycle: billingCycleFromDays(totalDays),
    status,
    remainingDays,
    totalDays,
    startsAt: m.startsAt.toISOString(),
    expiresAt: m.expiresAt.toISOString(),
    joinedAt: m.joinedAt.toISOString(),
    registrationDate: m.joinedAt.toISOString(),
    totalPaid: m.totalPaid,
    paymentStatus: m.totalPaid > 0 ? ("paid" as const) : ("unpaid" as const),
    registeredBy: displayRegisteredBy(m.registeredBy),
    addedByClerk: m.registeredBy === "CLERK",
    // epoch helpers for clerk table compatibility
    joinedAtMs: m.joinedAt.getTime(),
    expiresAtMs: m.expiresAt.getTime(),
    startsAtMs: m.startsAt.getTime(),
  };
}

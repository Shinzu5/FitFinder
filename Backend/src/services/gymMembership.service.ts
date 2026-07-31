import type { MembershipStatus, Prisma } from "@prisma/client";
import prisma from "../config/database";
import { emitMembershipUpdated, emitMembersUpdated } from "./realtime.service";

export type MemberType = "WALK_IN" | "ONLINE";
export type RegisteredBy = "OWNER" | "CLERK" | "SELF";

export type UpsertMembershipInput = {
  userId: string;
  gymId: string;
  planId?: string | null;
  planName: string;
  planPrice: number;
  durationDays: number;
  coachId?: string | null;
  paymentMethod: string;
  paymentRef: string;
  totalPaid: number;
  memberType: MemberType;
  registeredBy: RegisteredBy;
  registeredById?: string | null;
  expiresAt: Date;
  startsAt?: Date;
  status?: MembershipStatus;
};

type Tx = Prisma.TransactionClient;

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

/** Extend from remaining time (or now if expired): base + purchased days. */
export function computeExtendedExpiresAt(
  existingExpiresAt: Date | null | undefined,
  durationDays: number,
  now: Date = new Date(),
): Date {
  const base =
    existingExpiresAt && existingExpiresAt.getTime() > now.getTime()
      ? new Date(existingExpiresAt)
      : new Date(now);
  base.setDate(base.getDate() + durationDays);
  return base;
}

/** One membership row per user+gym — update existing instead of duplicating. */
export async function upsertGymMembership(
  data: UpsertMembershipInput & { accumulateTotalPaid?: boolean },
  tx: Tx | typeof prisma = prisma,
) {
  const startsAt = data.startsAt ?? new Date();
  const status = data.status ?? "ACTIVE";

  const existingRows = await tx.gymMembership.findMany({
    where: { userId: data.userId, gymId: data.gymId },
    orderBy: { joinedAt: "desc" },
    select: { id: true, totalPaid: true, joinedAt: true },
  });
  const existing = existingRows[0];

  // Keep a single record per user+gym — remove older duplicates
  if (existingRows.length > 1) {
    await tx.gymMembership.deleteMany({
      where: {
        id: { in: existingRows.slice(1).map((r) => r.id) },
      },
    });
  }

  if (existing) {
    const totalPaid = data.accumulateTotalPaid
      ? Number(existing.totalPaid || 0) + Number(data.totalPaid || 0)
      : data.totalPaid;

    return tx.gymMembership.update({
      where: { id: existing.id },
      data: {
        planId: data.planId ?? null,
        planName: data.planName,
        planPrice: data.planPrice,
        durationDays: data.durationDays,
        coachId: data.coachId ?? null,
        paymentMethod: data.paymentMethod,
        paymentRef: data.paymentRef,
        totalPaid,
        memberType: data.memberType,
        registeredBy: data.registeredBy,
        registeredById: data.registeredById ?? null,
        startsAt,
        // Never rewrite the original registration date on renew
        expiresAt: data.expiresAt,
        status,
      },
    });
  }

  return tx.gymMembership.create({
    data: {
      userId: data.userId,
      gymId: data.gymId,
      planId: data.planId ?? null,
      planName: data.planName,
      planPrice: data.planPrice,
      durationDays: data.durationDays,
      coachId: data.coachId ?? null,
      paymentMethod: data.paymentMethod,
      paymentRef: data.paymentRef,
      totalPaid: data.totalPaid,
      memberType: data.memberType,
      registeredBy: data.registeredBy,
      registeredById: data.registeredById ?? null,
      startsAt,
      joinedAt: startsAt,
      expiresAt: data.expiresAt,
      status,
    },
  });
}

export function shapeGymMember(m: {
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

export async function listGymMembers(gymId: string) {
  await prisma.gymMembership.updateMany({
    where: {
      gymId,
      status: { in: ["ACTIVE", "EXPIRING"] },
      expiresAt: { lt: new Date() },
    },
    data: { status: "EXPIRED" },
  });

  const memberships = await prisma.gymMembership.findMany({
    where: { gymId },
    include: {
      user: { select: { fullName: true, email: true } },
      plan: { select: { name: true, price: true, durationDays: true } },
    },
    orderBy: { joinedAt: "desc" },
  });

  return memberships.map(shapeGymMember);
}

/** Notify gymer + Owner/Clerk members lists after create/update/expire. */
export async function notifyMembershipChange(userId: string, gymId: string): Promise<void> {
  emitMembershipUpdated(userId);
  await emitMembersUpdated(gymId);
}

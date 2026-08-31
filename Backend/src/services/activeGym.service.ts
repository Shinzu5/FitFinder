import prisma from "../config/database";
import { expireOverdueMemberships } from "./membershipAccess.service";
import { emitToUser } from "../socket";
import { daysRemainingUntil } from "../utils/ownerPlan";

/** Live memberships for a user (ACTIVE/EXPIRING and not past expiresAt). */
export async function listLiveMemberships(userId: string) {
  await expireOverdueMemberships(userId);
  const now = new Date();
  return prisma.gymMembership.findMany({
    where: {
      userId,
      status: { in: ["ACTIVE", "EXPIRING"] },
      expiresAt: { gt: now },
    },
    include: {
      gym: { select: { id: true, name: true, coverImageUrl: true, address: true } },
      plan: { select: { name: true, price: true, durationDays: true } },
      coach: { select: { name: true, sessionPrice: true } },
    },
    orderBy: { joinedAt: "desc" },
  });
}

/** Live + expired memberships (for Enrolled Gyms switcher). */
export async function listEnrolledMemberships(userId: string) {
  const live = await listLiveMemberships(userId);
  const now = new Date();
  const liveGymIds = new Set(live.map((m) => m.gymId));
  const expired = await prisma.gymMembership.findMany({
    where: {
      userId,
      OR: [
        { status: "EXPIRED" },
        { status: { in: ["ACTIVE", "EXPIRING"] }, expiresAt: { lte: now } },
      ],
      ...(liveGymIds.size > 0 ? { gymId: { notIn: [...liveGymIds] } } : {}),
    },
    include: {
      gym: { select: { id: true, name: true, coverImageUrl: true, address: true } },
      plan: { select: { name: true, price: true, durationDays: true } },
      coach: { select: { name: true, sessionPrice: true } },
    },
    orderBy: { joinedAt: "desc" },
  });

  const seen = new Set<string>();
  const expiredUnique: typeof expired = [];
  for (const m of expired) {
    if (seen.has(m.gymId)) continue;
    seen.add(m.gymId);
    expiredUnique.push(m);
  }

  return [...live, ...expiredUnique];
}

/**
 * Resolve the gymer's currently selected gym.
 * Falls back to newest live membership and persists activeGymId when needed.
 */
export async function resolveActiveGymId(userId: string): Promise<string | null> {
  const live = await listLiveMemberships(userId);
  if (live.length === 0) {
    await prisma.user.update({
      where: { id: userId },
      data: { activeGymId: null },
    });
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { activeGymId: true },
  });

  if (user?.activeGymId && live.some((m) => m.gymId === user.activeGymId)) {
    return user.activeGymId;
  }

  const fallback = live[0].gymId;
  await prisma.user.update({
    where: { id: userId },
    data: { activeGymId: fallback },
  });
  return fallback;
}

/** Set active gym if the user has a live membership there. */
export async function setActiveGymId(
  userId: string,
  gymId: string,
): Promise<{ ok: true; gymId: string } | { ok: false; status: number; message: string }> {
  const live = await listLiveMemberships(userId);
  const match = live.find((m) => m.gymId === gymId);
  if (!match) {
    return {
      ok: false,
      status: 400,
      message: "You do not have an active membership at this gym",
    };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { activeGymId: gymId },
  });

  emitToUser(userId, "active_gym_changed", { gymId });
  emitToUser(userId, "membership_updated", {});
  return { ok: true, gymId };
}

/** After a membership becomes ACTIVE — set activeGymId only if unset. */
export async function ensureActiveGymIfEmpty(
  userId: string,
  gymId: string,
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { activeGymId: true },
  });
  if (user?.activeGymId) {
    const stillLive = await prisma.gymMembership.findFirst({
      where: {
        userId,
        gymId: user.activeGymId,
        status: { in: ["ACTIVE", "EXPIRING"] },
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
    });
    if (stillLive) return;
  }
  await prisma.user.update({
    where: { id: userId },
    data: { activeGymId: gymId },
  });
  emitToUser(userId, "active_gym_changed", { gymId });
}

export function shapeEnrolledMembership(
  m: Awaited<ReturnType<typeof listLiveMemberships>>[number],
  activeGymId: string | null,
) {
  const planName = m.planName || m.plan?.name || "Plan";
  const planPrice = m.planPrice > 0 ? m.planPrice : m.plan?.price ?? 0;
  const durationDays =
    m.durationDays > 0 ? m.durationDays : m.plan?.durationDays ?? 0;
  const remainingDays = daysRemainingUntil(m.expiresAt);
  const planType =
    String(m.memberType || "").toUpperCase() === "ONLINE" ? "Online" : "Walk-in";
  const isExpired =
    m.status === "EXPIRED" || remainingDays <= 0;
  const status = isExpired
    ? "Expired"
    : remainingDays <= 5
      ? "Expiring"
      : "Active";

  return {
    membershipId: m.id,
    gymId: m.gymId,
    gymName: m.gym.name,
    gymAddress: m.gym.address || "",
    coverImageUrl: m.gym.coverImageUrl || "",
    planId: m.planId,
    planName,
    planPrice,
    planType,
    durationDays,
    remainingDays: isExpired ? 0 : remainingDays,
    status,
    memberType: m.memberType,
    paymentMethod: m.paymentMethod,
    paymentRef: m.paymentRef,
    totalPaid: m.totalPaid,
    coachId: m.coachId,
    coachName: m.coach?.name || null,
    coachSessionPrice: m.coach?.sessionPrice || 0,
    joinedAt: m.joinedAt.toISOString(),
    expiresAt: m.expiresAt.toISOString(),
    isCurrent: !isExpired && activeGymId === m.gymId,
  };
}

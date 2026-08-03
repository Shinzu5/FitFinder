import prisma from "../config/database";
import { emitMembershipUpdated, emitMembersUpdated } from "./realtime.service";
import { notifyMembershipExpired } from "./membershipNotification.service";

/** Mark overdue ACTIVE/EXPIRING memberships as EXPIRED and notify affected users. */
export async function expireOverdueMemberships(userId?: string): Promise<number> {
  const now = new Date();
  const overdue = await prisma.gymMembership.findMany({
    where: {
      ...(userId ? { userId } : {}),
      status: { in: ["ACTIVE", "EXPIRING"] },
      expiresAt: { lt: now },
    },
    select: {
      id: true,
      userId: true,
      gymId: true,
      gym: { select: { name: true } },
    },
  });

  if (overdue.length === 0) return 0;

  await prisma.gymMembership.updateMany({
    where: { id: { in: overdue.map((m) => m.id) } },
    data: { status: "EXPIRED" },
  });

  const uniqueUserIds = [...new Set(overdue.map((m) => m.userId))];
  for (const id of uniqueUserIds) {
    emitMembershipUpdated(id);
  }

  const uniqueGymIds = [...new Set(overdue.map((m) => m.gymId))];
  for (const gymId of uniqueGymIds) {
    void emitMembersUpdated(gymId);
  }

  // Persist + realtime inbox notifications (deduped per membership)
  for (const m of overdue) {
    void notifyMembershipExpired({
      userId: m.userId,
      gymId: m.gymId,
      membershipId: m.id,
      gymName: m.gym.name,
    });
  }

  return overdue.length;
}

export function membershipPlanSnapshot(plan: {
  name: string;
  price: number;
  durationDays: number;
}) {
  return {
    planName: plan.name,
    planPrice: plan.price,
    durationDays: plan.durationDays,
  };
}

/** Prefer stored purchase snapshot; fall back to live plan relation if needed. */
export function resolveMembershipPlanFields(m: {
  planName?: string | null;
  planPrice?: number | null;
  durationDays?: number | null;
  plan?: { name: string; price: number; durationDays: number } | null;
}) {
  return {
    planName: (m.planName && m.planName.trim()) || m.plan?.name || "",
    planPrice: m.planPrice && m.planPrice > 0 ? m.planPrice : m.plan?.price ?? 0,
    durationDays:
      m.durationDays && m.durationDays > 0
        ? m.durationDays
        : m.plan?.durationDays ?? 0,
  };
}

/** Backfill empty snapshots from the linked plan (safe for soft-deleted plans). */
export async function backfillMissingPlanSnapshots(): Promise<void> {
  const memberships = await prisma.gymMembership.findMany({
    where: {
      planId: { not: null },
      OR: [{ planName: "" }, { durationDays: 0 }],
    },
    include: { plan: { select: { name: true, price: true, durationDays: true } } },
  });

  for (const m of memberships) {
    if (!m.plan) continue;
    await prisma.gymMembership.update({
      where: { id: m.id },
      data: membershipPlanSnapshot(m.plan),
    });
  }

  const approvals = await prisma.walkInApproval.findMany({
    where: {
      planId: { not: null },
      OR: [{ planName: "" }, { planPrice: 0 }],
    },
    include: { plan: { select: { name: true, price: true } } },
  });

  for (const a of approvals) {
    if (!a.plan) continue;
    await prisma.walkInApproval.update({
      where: { id: a.id },
      data: { planName: a.plan.name, planPrice: a.plan.price },
    });
  }
}

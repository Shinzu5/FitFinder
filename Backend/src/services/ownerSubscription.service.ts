import { Prisma } from "@prisma/client";
import prisma from "../config/database";
import { resolveOwnerPlanFromMetadata } from "../config/ownerPlans";
import {
  addOwnerPlanDays,
  computeOwnerPlanValidUntil,
  daysRemainingUntil,
  storedDurationToDays,
} from "../utils/ownerPlan";
import {
  emitAdminGymsUpdated,
  emitAdminUsersUpdated,
  emitToUserSafe,
} from "./realtime.service";

type PaymentLike = {
  id: string;
  userId: string;
  amount: number;
  referenceId: string;
  metadata: unknown;
  paidAt?: Date | null;
};

/**
 * Idempotent: exactly one OwnerSubscription per successful payment referenceNo.
 * Safe under concurrent webhook + status-poll activation.
 *
 * Remaining days = plan duration from paidAt (no stacking leftover days from
 * older purchases — admin "Standard / 30 days" must match days left).
 */
export async function ensureOwnerSubscriptionFromPayment(
  payment: PaymentLike,
  options?: { stack?: boolean; emit?: boolean },
): Promise<{
  id: string;
  planName: string;
  months: number;
  durationDays: number;
  validUntil: Date;
  daysLeft: number;
  created: boolean;
} | null> {
  // Default: do not stack. Remaining days must match the purchased plan.
  const stack = options?.stack === true;
  const shouldEmit = options?.emit !== false;
  const meta = (payment.metadata || {}) as Record<string, unknown>;

  const existing = await prisma.ownerSubscription.findUnique({
    where: { referenceNo: payment.referenceId },
  });
  if (existing) {
    const durationDays = storedDurationToDays(existing.months);
    return {
      id: existing.id,
      planName: existing.planName,
      months: existing.months,
      durationDays,
      validUntil: existing.validUntil,
      daysLeft: daysRemainingUntil(existing.validUntil),
      created: false,
    };
  }

  const catalogPlan = resolveOwnerPlanFromMetadata(meta);
  const durationDays = catalogPlan
    ? catalogPlan.days
    : storedDurationToDays(Number(meta.days ?? meta.durationDays ?? meta.months) || 30);
  const planId = catalogPlan?.id || String(meta.planId || "");
  const planName = catalogPlan?.name || String(meta.planName || "Plan");
  // Charge amount from Xendit; catalog enforces price at payment create time
  const price = payment.amount;
  const paidAt = payment.paidAt || new Date();

  try {
    const created = await prisma.$transaction(async (tx) => {
      // Re-check inside transaction to close the race window
      const raced = await tx.ownerSubscription.findUnique({
        where: { referenceNo: payment.referenceId },
      });
      if (raced) return { row: raced, created: false as const };

      let validUntil: Date;
      if (stack) {
        const latestActive = await tx.ownerSubscription.findFirst({
          where: {
            ownerId: payment.userId,
            validUntil: { gt: new Date() },
          },
          orderBy: { validUntil: "desc" },
        });
        validUntil = computeOwnerPlanValidUntil(durationDays, latestActive?.validUntil);
      } else {
        validUntil = addOwnerPlanDays(paidAt, durationDays);
      }

      const gym = await tx.gym.findFirst({
        where: { ownerId: payment.userId },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });

      const row = await tx.ownerSubscription.create({
        data: {
          ownerId: payment.userId,
          gymId: gym?.id ?? null,
          planId,
          planName,
          price,
          // Store duration in days (column name `months` kept for schema compatibility)
          months: durationDays,
          referenceNo: payment.referenceId,
          method: "Xendit",
          paidAt,
          validUntil,
        },
      });

      await tx.user.update({
        where: { id: payment.userId },
        data: { role: "OWNER" },
      });

      return { row, created: true as const };
    });

    const daysLeft = daysRemainingUntil(created.row.validUntil);
    if (shouldEmit && created.created) {
      emitToUserSafe(payment.userId, "owner_subscription_updated", {
        subscriptionId: created.row.id,
        planName: created.row.planName,
        months: created.row.months,
        durationDays,
        validUntil: created.row.validUntil.toISOString(),
        daysLeft,
      });
      void emitAdminGymsUpdated();
      void emitAdminUsersUpdated();
    }

    return {
      id: created.row.id,
      planName: created.row.planName,
      months: created.row.months,
      durationDays,
      validUntil: created.row.validUntil,
      daysLeft,
      created: created.created,
    };
  } catch (error) {
    // Concurrent create lost the unique race — return the winner
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const winner = await prisma.ownerSubscription.findUnique({
        where: { referenceNo: payment.referenceId },
      });
      if (winner) {
        const durationDaysWinner = storedDurationToDays(winner.months);
        return {
          id: winner.id,
          planName: winner.planName,
          months: winner.months,
          durationDays: durationDaysWinner,
          validUntil: winner.validUntil,
          daysLeft: daysRemainingUntil(winner.validUntil),
          created: false,
        };
      }
    }
    throw error;
  }
}

/** Remove duplicate OwnerSubscription rows that share the same referenceNo (legacy race). */
export async function dedupeOwnerSubscriptionsByReference(): Promise<number> {
  const duplicates = await prisma.$queryRaw<Array<{ referenceNo: string; cnt: bigint }>>`
    SELECT "referenceNo", COUNT(*)::bigint AS cnt
    FROM owner_subscriptions
    GROUP BY "referenceNo"
    HAVING COUNT(*) > 1
  `;

  let removed = 0;
  for (const dup of duplicates) {
    const rows = await prisma.ownerSubscription.findMany({
      where: { referenceNo: dup.referenceNo },
      orderBy: { paidAt: "asc" },
    });
    // Keep the earliest (correct non-stacked) row; delete the rest
    const [, ...extras] = rows;
    for (const extra of extras) {
      await prisma.ownerSubscription.delete({ where: { id: extra.id } });
      removed += 1;
    }
  }

  if (removed > 0) {
    void emitAdminGymsUpdated();
  }
  return removed;
}

/** Repair missing OwnerSubscription rows from SUCCEEDED Xendit payments. */
export async function backfillOwnerSubscriptionsFromPayments(): Promise<number> {
  await dedupeOwnerSubscriptionsByReference();

  const payments = await prisma.xenditPayment.findMany({
    where: { type: "SUBSCRIPTION", status: "SUCCEEDED" },
    orderBy: { paidAt: "asc" },
  });

  let created = 0;
  for (const payment of payments) {
    const result = await ensureOwnerSubscriptionFromPayment(payment, {
      stack: false,
      emit: false,
    });
    if (result?.created) created += 1;
  }

  await linkUnlinkedSubscriptionsToGyms();

  if (created > 0) {
    void emitAdminGymsUpdated();
  }

  return created;
}

/**
 * Lightweight heal for admin views: dedupe, then ensure each owner's latest SUCCEEDED
 * payment has an OwnerSubscription row.
 */
export async function syncLatestOwnerSubscriptions(): Promise<number> {
  await dedupeOwnerSubscriptionsByReference();

  const payments = await prisma.xenditPayment.findMany({
    where: { type: "SUBSCRIPTION", status: "SUCCEEDED" },
    orderBy: { paidAt: "desc" },
  });

  const seenOwners = new Set<string>();
  let created = 0;

  for (const payment of payments) {
    if (seenOwners.has(payment.userId)) continue;
    seenOwners.add(payment.userId);

    const result = await ensureOwnerSubscriptionFromPayment(payment, {
      stack: false,
      emit: false,
    });
    if (result?.created) created += 1;
  }

  await linkUnlinkedSubscriptionsToGyms();
  return created;
}

/** Fix stacked validUntil so each row is paidAt + plan duration days. */
export async function healOwnerSubscriptionDurations(): Promise<number> {
  const rows = await prisma.ownerSubscription.findMany({
    select: { id: true, paidAt: true, months: true, validUntil: true },
  });
  let fixed = 0;
  for (const row of rows) {
    const days = storedDurationToDays(row.months);
    const correct = addOwnerPlanDays(row.paidAt, days);
    if (Math.abs(correct.getTime() - row.validUntil.getTime()) > 1000) {
      await prisma.ownerSubscription.update({
        where: { id: row.id },
        data: { validUntil: correct },
      });
      fixed += 1;
    }
  }
  if (fixed > 0) void emitAdminGymsUpdated();
  return fixed;
}

async function linkUnlinkedSubscriptionsToGyms(): Promise<void> {
  const unlinked = await prisma.ownerSubscription.findMany({
    where: { gymId: null },
    select: { id: true, ownerId: true },
  });
  for (const sub of unlinked) {
    const gym = await prisma.gym.findFirst({
      where: { ownerId: sub.ownerId },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (gym) {
      await prisma.ownerSubscription.update({
        where: { id: sub.id },
        data: { gymId: gym.id },
      });
    }
  }
}

/** Attach the owner's latest plan to a gym (used on gym create). */
export async function linkOwnerSubscriptionToGym(
  ownerId: string,
  gymId: string,
  subscriptionId?: string | null,
): Promise<void> {
  if (subscriptionId) {
    await prisma.ownerSubscription.updateMany({
      where: { id: subscriptionId, ownerId },
      data: { gymId },
    });
    return;
  }

  const latest = await prisma.ownerSubscription.findFirst({
    where: { ownerId },
    orderBy: { paidAt: "desc" },
  });
  if (latest) {
    await prisma.ownerSubscription.update({
      where: { id: latest.id },
      data: { gymId },
    });
  }
}

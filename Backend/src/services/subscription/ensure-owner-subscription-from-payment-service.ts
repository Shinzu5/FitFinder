import { Prisma } from "@prisma/client";
import { SubscriptionRepository } from "@/repositories/subscription.repository";
import { resolveOwnerPlanFromMetadata } from "@/config/ownerPlans";
import {
  addOwnerPlanDays,
  computeOwnerPlanValidUntil,
  daysRemainingUntil,
  storedDurationToDays,
} from "@/utils/ownerPlan";
import { EmitToUserSafeService as emitToUserSafe } from "@/services/realtime/emit-to-user-safe-service";
import { EmitAdminGymsUpdatedService as emitAdminGymsUpdated } from "@/services/realtime/emit-admin-gyms-updated-service";
import { EmitAdminUsersUpdatedService as emitAdminUsersUpdated } from "@/services/realtime/emit-admin-users-updated-service";

const subscriptionRepository = new SubscriptionRepository();

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
export async function EnsureOwnerSubscriptionFromPaymentService(
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

  const existing = await subscriptionRepository.findByReferenceNo(payment.referenceId);
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
    const created = await subscriptionRepository.createSubscriptionIfAbsent({
      ownerId: payment.userId,
      referenceNo: payment.referenceId,
      planId,
      planName,
      price,
      durationDays,
      paidAt,
      stack,
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
      const winner = await subscriptionRepository.findByReferenceNo(payment.referenceId);
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

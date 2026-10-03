import { OwnerSubscription, Prisma } from "@prisma/client";
import { AdminRepository } from "@/repositories/admin.repository";
import { SubscriptionRepository } from "@/repositories/subscription.repository";
import { UserRepository } from "@/repositories/user.repository";
import { computeOwnerPlanValidUntil } from "@/utils/ownerPlan";
import type { OwnerPlanDefinition } from "@/types/subscription";

const adminRepository = new AdminRepository();
const subscriptionRepository = new SubscriptionRepository();
const userRepository = new UserRepository();

/**
 * Manual / compatibility owner-plan purchase (POST /api/subscriptions/purchase).
 * Idempotent on referenceNo: a duplicate (or lost unique race) returns the
 * winning row as `already`. Promotes the payer to OWNER only on first creation.
 * Moved out of subscription.controller — no DB access in controllers.
 */
export async function PurchaseOwnerSubscriptionService(args: {
  ownerId: string;
  plan: OwnerPlanDefinition;
  referenceNo: string;
  method?: string;
}): Promise<{
  kind: "already" | "created";
  subscription: OwnerSubscription;
}> {
  const { ownerId, plan, referenceNo, method } = args;

  const existing = await subscriptionRepository.findByReferenceNo(referenceNo);
  if (existing) {
    return { kind: "already", subscription: existing };
  }

  // No stacking — remaining days must equal the purchased plan duration
  const validUntil = computeOwnerPlanValidUntil(plan.days, null);

  let subscription;
  try {
    subscription = await subscriptionRepository.createOwnerSubscription({
      ownerId,
      planId: plan.id,
      planName: plan.name,
      price: plan.price,
      months: plan.days,
      referenceNo,
      method: method || "Xendit",
      validUntil,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const winner = await subscriptionRepository.findByReferenceNo(referenceNo);
      if (winner) {
        return { kind: "already", subscription: winner };
      }
    }
    throw error;
  }

  await userRepository.updateById(ownerId, { role: "OWNER" });

  await adminRepository.createActivity({
    data: {
      message: `New subscription purchase: ${plan.name} plan`,
      tone: "INFO",
    },
  });

  return { kind: "created", subscription };
}

import { Response } from "express";
import prisma from "../config/database";
import { sendSuccess, sendError, sendCreated } from "../utils/apiResponse";
import { AuthRequest } from "../middleware/auth";
import { getOwnerPlanById } from "../config/ownerPlans";
import {
  computeOwnerPlanValidUntil,
  daysRemainingUntil,
  storedDurationToDays,
} from "../utils/ownerPlan";
import { emitAdminGymsUpdated } from "../services/realtime.service";
import { emitToUser } from "../socket";
import { Prisma } from "@prisma/client";

// POST /api/subscriptions/purchase
// Kept for compatibility — prefers Xendit flow. Idempotent on referenceNo.
export async function purchaseSubscription(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { planId, referenceNo, method } = req.body;
    const plan = getOwnerPlanById(String(planId || ""));
    if (!plan) {
      sendError(res, "Invalid owner subscription plan");
      return;
    }

    const ref =
      typeof referenceNo === "string" && referenceNo.trim()
        ? referenceNo.trim()
        : `MANUAL-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;

    const existing = await prisma.ownerSubscription.findUnique({
      where: { referenceNo: ref },
    });
    if (existing) {
      sendSuccess(
        res,
        {
          id: existing.id,
          referenceNo: existing.referenceNo,
          paidAt: existing.paidAt.toISOString(),
          validUntil: existing.validUntil.toISOString(),
          daysLeft: daysRemainingUntil(existing.validUntil),
          durationDays: storedDurationToDays(existing.months),
        },
        "Subscription already recorded",
      );
      return;
    }

    // No stacking — remaining days must equal the purchased plan duration
    const validUntil = computeOwnerPlanValidUntil(plan.days, null);

    let subscription;
    try {
      subscription = await prisma.ownerSubscription.create({
        data: {
          ownerId: req.userId!,
          planId: plan.id,
          planName: plan.name,
          price: plan.price,
          months: plan.days,
          referenceNo: ref,
          method: method || "Xendit",
          validUntil,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const winner = await prisma.ownerSubscription.findUnique({
          where: { referenceNo: ref },
        });
        if (winner) {
          sendSuccess(
            res,
            {
              id: winner.id,
              referenceNo: winner.referenceNo,
              paidAt: winner.paidAt.toISOString(),
              validUntil: winner.validUntil.toISOString(),
              daysLeft: daysRemainingUntil(winner.validUntil),
              durationDays: storedDurationToDays(winner.months),
            },
            "Subscription already recorded",
          );
          return;
        }
      }
      throw error;
    }

    await prisma.user.update({
      where: { id: req.userId! },
      data: { role: "OWNER" },
    });

    await prisma.adminActivity.create({
      data: {
        message: `New subscription purchase: ${plan.name} plan`,
        tone: "INFO",
      },
    });

    emitToUser(req.userId!, "owner_subscription_updated", {
      subscriptionId: subscription.id,
      planName: subscription.planName,
      months: subscription.months,
      durationDays: plan.days,
      validUntil: subscription.validUntil.toISOString(),
      daysLeft: daysRemainingUntil(subscription.validUntil),
    });
    void emitAdminGymsUpdated();

    sendCreated(
      res,
      {
        id: subscription.id,
        referenceNo: subscription.referenceNo,
        paidAt: subscription.paidAt.toISOString(),
        validUntil: subscription.validUntil.toISOString(),
        daysLeft: daysRemainingUntil(subscription.validUntil),
        durationDays: plan.days,
      },
      "Subscription activated",
    );
  } catch (error) {
    console.error("Purchase subscription error:", error);
    sendError(res, "Failed to process subscription", 500);
  }
}

// GET /api/subscriptions/my-plan
export async function getMyPlan(req: AuthRequest, res: Response): Promise<void> {
  try {
    const subscription = await prisma.ownerSubscription.findFirst({
      where: { ownerId: req.userId! },
      orderBy: { paidAt: "desc" },
      include: {
        gym: { select: { id: true, name: true } },
      },
    });

    if (!subscription) {
      sendSuccess(res, null, "No active subscription");
      return;
    }

    const durationDays = storedDurationToDays(subscription.months);

    sendSuccess(res, {
      id: subscription.id,
      planId: subscription.planId,
      planName: subscription.planName,
      price: subscription.price,
      months: durationDays,
      durationDays,
      referenceNo: subscription.referenceNo,
      method: subscription.method,
      paidAt: subscription.paidAt.toISOString(),
      validUntil: subscription.validUntil.toISOString(),
      daysLeft: daysRemainingUntil(subscription.validUntil),
      gym: subscription.gym,
    });
  } catch (error) {
    console.error("Get my plan error:", error);
    sendError(res, "Failed to fetch subscription", 500);
  }
}

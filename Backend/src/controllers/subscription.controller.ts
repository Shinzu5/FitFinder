import { Response } from "express";
import prisma from "../config/database";
import { sendSuccess, sendError } from "../utils/apiResponse";
import { AuthRequest } from "../middlewares/auth-middleware";
import {
  daysRemainingUntil,
  storedDurationToDays,
} from "../utils/ownerPlan";

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

import { Response } from "express";
import prisma from "../config/database";
import { sendSuccess, sendError, sendCreated } from "../utils/apiResponse";
import { AuthRequest } from "../middleware/auth";

// POST /api/subscriptions/purchase
export async function purchaseSubscription(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { planId, planName, price, months, referenceNo, method } = req.body;

    const validUntil = new Date();
    validUntil.setMonth(validUntil.getMonth() + months);

    const subscription = await prisma.ownerSubscription.create({
      data: {
        ownerId: req.userId!,
        planId,
        planName,
        price,
        months,
        referenceNo: referenceNo || `XDT-${Date.now().toString().slice(-7)}-${Math.floor(Math.random() * 9000 + 1000)}`,
        method: method || "Xendit",
        validUntil,
      },
    });

    // Update user role to OWNER if not already
    await prisma.user.update({
      where: { id: req.userId! },
      data: { role: "OWNER" },
    });

    // Record admin activity
    await prisma.adminActivity.create({
      data: {
        message: `New subscription purchase: ${planName} plan`,
        tone: "INFO",
      },
    });

    sendCreated(res, {
      id: subscription.id,
      referenceNo: subscription.referenceNo,
      paidAt: subscription.paidAt.toISOString(),
      validUntil: subscription.validUntil.toISOString(),
    }, "Subscription activated");
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

    sendSuccess(res, {
      id: subscription.id,
      planId: subscription.planId,
      planName: subscription.planName,
      price: subscription.price,
      months: subscription.months,
      referenceNo: subscription.referenceNo,
      method: subscription.method,
      paidAt: subscription.paidAt.toISOString(),
      validUntil: subscription.validUntil.toISOString(),
      gym: subscription.gym,
    });
  } catch (error) {
    console.error("Get my plan error:", error);
    sendError(res, "Failed to fetch subscription", 500);
  }
}

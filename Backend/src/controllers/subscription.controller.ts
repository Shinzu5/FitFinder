import { Response } from "express";
import { sendSuccess, sendError, sendCreated } from "@/utils/apiResponse";
import { AuthRequest } from "@/types/common";
import { getOwnerPlanById } from "@/config/ownerPlans";
import { daysRemainingUntil, storedDurationToDays } from "@/utils/ownerPlan";
import { EmitAdminGymsUpdatedService } from "@/services/realtime";
import { GetMyPlanService, PurchaseOwnerSubscriptionService } from "@/services/subscription";
import { emitToUser } from "@/socket";

export class SubscriptionController {
  // POST /api/subscriptions/purchase
  // Kept for compatibility — prefers Xendit flow. Idempotent on referenceNo.
  public purchaseSubscription = async (req: AuthRequest, res: Response): Promise<void> => {
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

      const result = await PurchaseOwnerSubscriptionService({
        ownerId: req.userId!,
        plan,
        referenceNo: ref,
        method,
      });
      const subscription = result.subscription;

      if (result.kind === "already") {
        sendSuccess(
          res,
          {
            id: subscription.id,
            referenceNo: subscription.referenceNo,
            paidAt: subscription.paidAt.toISOString(),
            validUntil: subscription.validUntil.toISOString(),
            daysLeft: daysRemainingUntil(subscription.validUntil),
            durationDays: storedDurationToDays(subscription.months),
          },
          "Subscription already recorded",
        );
        return;
      }

      emitToUser(req.userId!, "owner_subscription_updated", {
        subscriptionId: subscription.id,
        planName: subscription.planName,
        months: subscription.months,
        durationDays: plan.days,
        validUntil: subscription.validUntil.toISOString(),
        daysLeft: daysRemainingUntil(subscription.validUntil),
      });
      void EmitAdminGymsUpdatedService();

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
  };

  // GET /api/subscriptions/my-plan
  public getMyPlan = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const subscription = await GetMyPlanService(req.userId!);

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
  };
}

export default new SubscriptionController();

import { Request, Response } from "express";
import prisma from "../config/database";
import { env } from "../config/env";
import { sendSuccess, sendError, sendCreated } from "../utils/apiResponse";
import { AuthRequest } from "../middleware/auth";
import {
  createGcashPayment,
  getPaymentStatus,
  verifyWebhookToken,
} from "../services/xendit.service";
import {
  emitAdminGymsUpdated,
} from "../services/realtime.service";
import { notifyMembershipChange } from "../services/gymMembership.service";
import { createPendingApproval } from "../services/membershipApproval.service";
import { ensureOwnerSubscriptionFromPayment } from "../services/ownerSubscription.service";
import { createNotification } from "../services/notification.service";
import { getOwnerPlanById } from "../config/ownerPlans";
import { daysRemainingUntil, storedDurationToDays } from "../utils/ownerPlan";
import { generateAccessToken, generateRefreshToken } from "../utils/jwt";

/**
 * POST /api/payments/create-gcash
 * Creates a Xendit GCash payment request and returns the redirect URL.
 *
 * Body:
 *   - type: "SUBSCRIPTION" | "MEMBERSHIP"
 *   - amount: number
 *   - description: string
 *   - metadata: { planId, planName, days, gymId?, coachId?, ... }
 */
export async function createGcashPaymentHandler(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const { type, amount, description } = req.body;
    let metadata = req.body.metadata || {};

    if (!type || !amount || amount <= 0) {
      sendError(res, "Invalid payment parameters");
      return;
    }

    if (!["SUBSCRIPTION", "MEMBERSHIP"].includes(type)) {
      sendError(res, "Payment type must be SUBSCRIPTION or MEMBERSHIP");
      return;
    }

    if (type === "SUBSCRIPTION") {
      const plan = getOwnerPlanById(String(metadata?.planId || ""));
      if (!plan) {
        sendError(res, "Invalid owner subscription plan");
        return;
      }
      if (Math.abs(Number(amount) - plan.price) > 0.01) {
        sendError(
          res,
          `Payment amount must equal plan price (₱${plan.price.toLocaleString()})`,
        );
        return;
      }
      metadata = {
        ...metadata,
        planId: plan.id,
        planName: plan.name,
        days: plan.days,
        durationDays: plan.days,
        price: plan.price,
      };
    }

    if (type === "MEMBERSHIP") {
      const gymId = metadata?.gymId as string | undefined;
      const planId = metadata?.planId as string | undefined;
      const coachId = (metadata?.coachId as string | undefined) || null;
      if (!gymId || !planId) {
        sendError(res, "Membership payment requires gymId and planId");
        return;
      }
      const plan = await prisma.membershipPlan.findFirst({
        where: { id: planId, gymId, isActive: true },
      });
      if (!plan) {
        sendError(res, "Membership plan not found for this gym");
        return;
      }

      let coachSessionPrice = 0;
      let coachName: string | null = null;
      if (coachId) {
        const coach = await prisma.coach.findFirst({
          where: { id: coachId, gymId, isActive: true },
        });
        if (!coach) {
          sendError(
            res,
            "Selected coach is no longer available. Please choose another coach or continue without one.",
          );
          return;
        }
        coachSessionPrice = coach.sessionPrice;
        coachName = coach.name;
      }

      const expectedTotal = plan.price + coachSessionPrice;
      if (Math.abs(Number(amount) - expectedTotal) > 0.01) {
        sendError(
          res,
          `Payment amount must equal membership + coach session (₱${expectedTotal.toLocaleString()})`,
        );
        return;
      }

      metadata = {
        ...metadata,
        durationDays: plan.durationDays,
        planName: plan.name,
        coachId,
        coachName,
        planPrice: plan.price,
        coachSessionPrice,
      };
    }

    // Generate a unique reference ID
    const referenceId = `FF-${type.slice(0, 3)}-${Date.now()}-${Math.floor(
      Math.random() * 9000 + 1000
    )}`;

    const frontendUrl = env.FRONTEND_URL;

    // Build return URLs based on payment type (use known referenceId — never a placeholder)
    let successUrl: string;
    let failureUrl: string;

    if (type === "SUBSCRIPTION") {
      successUrl = `${frontendUrl}/dashboard/user/create-gym/done?payment_id=${encodeURIComponent(referenceId)}`;
      failureUrl = `${frontendUrl}/dashboard/user/create-gym/payment?payment_failed=true`;
    } else {
      const gymId = metadata?.gymId || "";
      successUrl = `${frontendUrl}/dashboard/user/gym/${gymId}/join/gcash/success?payment_id=${encodeURIComponent(referenceId)}`;
      failureUrl = `${frontendUrl}/dashboard/user/gym/${gymId}/join/gcash?payment_failed=true`;
    }

    // Membership cashless uses the gym's Xendit key; Owner plan uses platform key
    let gymApiKey: string | undefined;
    if (type === "MEMBERSHIP") {
      const gymId = metadata?.gymId as string;
      const gym = await prisma.gym.findUnique({ where: { id: gymId } });
      if (!gym) {
        sendError(res, "Gym not found", 404);
        return;
      }
      const key = (gym.xenditApiKey || "").trim();
      const keyOk =
        key.startsWith("xnd_production_") || key.startsWith("xnd_development_");
      if (!gym.xenditEnabled || !keyOk) {
        sendError(
          res,
          "Cashless payment is not available for this gym. Choose Walk-in Payment.",
        );
        return;
      }
      gymApiKey = key;
    }

    // Create the Xendit payment
    const xenditResult = await createGcashPayment({
      referenceId,
      amount,
      description,
      successReturnUrl: successUrl,
      failureReturnUrl: failureUrl,
      metadata: {
        userId: req.userId,
        type,
        ...metadata,
      },
      apiKey: gymApiKey,
    });

    // Store payment record in database
    const payment = await prisma.xenditPayment.create({
      data: {
        xenditPaymentId: xenditResult.paymentId,
        referenceId,
        userId: req.userId!,
        type,
        amount,
        status: "PENDING",
        channelCode: "GCASH",
        redirectUrl: xenditResult.redirectUrl,
        metadata: metadata || {},
      },
    });

    sendCreated(
      res,
      {
        paymentId: payment.id,
        xenditPaymentId: xenditResult.paymentId,
        referenceId,
        redirectUrl: xenditResult.redirectUrl,
        status: "PENDING",
      },
      "GCash payment created — redirect user to authorize"
    );
  } catch (error) {
    console.error("Create GCash payment error:", error);
    sendError(res, "Failed to create GCash payment", 500);
  }
}

/**
 * GET /api/payments/:id/status
 * Check payment status (frontend polls this after redirect).
 * On SUCCEEDED, always re-runs activation (idempotent) so membership unlocks even if the first attempt failed.
 */
export async function checkPaymentStatus(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const id = req.params.id as string;

    const payment = await prisma.xenditPayment.findFirst({
      where: {
        OR: [
          { id: id },
          { xenditPaymentId: id },
          { referenceId: id },
        ],
      },
    });

    if (!payment) {
      sendError(res, "Payment not found", 404);
      return;
    }

    let status = payment.status;
    let paidAt = payment.paidAt;

    // If payment is still pending, check Xendit for the latest status
    if (payment.status === "PENDING") {
      try {
        const xenditStatus = await getPaymentStatus(payment.xenditPaymentId);

        if (xenditStatus.status !== payment.status) {
          const isSucceeded =
            xenditStatus.status === "SUCCEEDED" ||
            xenditStatus.status === "COMPLETED";

          await prisma.xenditPayment.update({
            where: { id: payment.id },
            data: {
              status: isSucceeded ? "SUCCEEDED" : xenditStatus.status,
              paidAt: isSucceeded ? new Date() : null,
            },
          });

          status = isSucceeded ? "SUCCEEDED" : xenditStatus.status;
          paidAt = isSucceeded ? new Date() : null;
        }
      } catch (err) {
        console.error("Failed to poll Xendit status:", err);
      }
    }

    let membershipActive = false;
    let subscription: {
      id: string;
      planName: string;
      months: number;
      durationDays: number;
      validUntil: string;
      daysLeft: number;
    } | null = null;
    let authPayload: {
      accessToken: string;
      refreshToken: string;
      user: {
        id: string;
        fullName: string;
        email: string;
        role: string;
        avatarUrl: string | null;
      };
    } | null = null;

    if (status === "SUCCEEDED") {
      membershipActive = await activatePayment({
        id: payment.id,
        userId: payment.userId,
        type: payment.type,
        amount: payment.amount,
        referenceId: payment.referenceId,
        metadata: payment.metadata,
      });

      // Confirm ACTIVE membership exists for MEMBERSHIP payments
      if (payment.type === "MEMBERSHIP") {
        const meta = (payment.metadata || {}) as Record<string, unknown>;
        const gymId = meta.gymId as string | undefined;
        if (gymId) {
          const membership = await prisma.gymMembership.findFirst({
            where: {
              userId: payment.userId,
              gymId,
              status: { in: ["ACTIVE", "EXPIRING"] },
            },
          });
          membershipActive = Boolean(membership);
        }
      } else if (payment.type === "SUBSCRIPTION") {
        membershipActive = true;
        const sub = await prisma.ownerSubscription.findFirst({
          where: { referenceNo: payment.referenceId },
          orderBy: { paidAt: "desc" },
        });
        if (sub) {
          const durationDays = storedDurationToDays(sub.months);
          subscription = {
            id: sub.id,
            planName: sub.planName,
            months: durationDays,
            durationDays,
            validUntil: sub.validUntil.toISOString(),
            daysLeft: daysRemainingUntil(sub.validUntil),
          };
        }

        // Issue fresh tokens so the client becomes OWNER without a page reload
        const user = await prisma.user.findUnique({ where: { id: payment.userId } });
        if (user) {
          const accessToken = generateAccessToken({
            userId: user.id,
            role: user.role,
          });
          const refreshToken = generateRefreshToken({
            userId: user.id,
            role: user.role,
          });
          await prisma.user.update({
            where: { id: user.id },
            data: { refreshToken },
          });
          authPayload = {
            accessToken,
            refreshToken,
            user: {
              id: user.id,
              fullName: user.fullName,
              email: user.email,
              role: user.role,
              avatarUrl: user.avatarUrl,
            },
          };
        }
      }
    }

    sendSuccess(res, {
      id: payment.id,
      status,
      referenceId: payment.referenceId,
      amount: payment.amount,
      paidAt: paidAt?.toISOString() || null,
      membershipActive,
      subscription,
      ...(authPayload
        ? {
            accessToken: authPayload.accessToken,
            refreshToken: authPayload.refreshToken,
            user: authPayload.user,
          }
        : {}),
    });
  } catch (error) {
    console.error("Check payment status error:", error);
    sendError(res, "Failed to check payment status", 500);
  }
}

/**
 * POST /api/payments/xendit-webhook
 * Receive and process Xendit webhook callbacks.
 * This is called by Xendit when a payment status changes.
 */
export async function xenditWebhook(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const callbackToken = req.headers["x-callback-token"] as string;

    if (!verifyWebhookToken(callbackToken)) {
      console.warn("Invalid Xendit webhook token");
      res.status(403).json({ error: "Invalid callback token" });
      return;
    }

    const { event, data } = req.body;

    if (!data?.id) {
      res.status(400).json({ error: "Invalid webhook payload" });
      return;
    }

    // Find the payment by Xendit payment ID
    const payment = await prisma.xenditPayment.findFirst({
      where: {
        OR: [
          { xenditPaymentId: data.id },
          { referenceId: data.reference_id },
        ],
      },
    });

    if (!payment) {
      console.warn("Webhook: payment not found for", data.id);
      res.status(200).json({ received: true }); // Don't retry
      return;
    }

    // Update payment status based on event
    const isSuccess =
      event === "payment.succeeded" ||
      data.status === "SUCCEEDED" ||
      data.status === "COMPLETED";
    const isFailed =
      event === "payment.failed" ||
      data.status === "FAILED" ||
      data.status === "EXPIRED";

    const newStatus = isSuccess
      ? "SUCCEEDED"
      : isFailed
        ? "FAILED"
        : data.status || payment.status;

    await prisma.xenditPayment.update({
      where: { id: payment.id },
      data: {
        status: newStatus,
        paidAt: isSuccess ? payment.paidAt || new Date() : null,
      },
    });

    // Always attempt activation on success (idempotent) — covers first webhook and retries
    if (isSuccess) {
      await activatePayment(payment);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error("Xendit webhook error:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
}

/**
 * Activate a subscription or membership after successful payment.
 * Idempotent — safe to call repeatedly for SUCCEEDED payments.
 */
/** Idempotent post-payment activation for owner SUBSCRIPTION or MEMBERSHIP (approval queue). */
async function activatePayment(payment: {
  id: string;
  userId: string;
  type: string;
  amount: number;
  referenceId: string;
  metadata: unknown;
}): Promise<boolean> {
  const meta = (payment.metadata || {}) as Record<string, unknown>;

  if (payment.type === "SUBSCRIPTION") {
    try {
      const sub = await ensureOwnerSubscriptionFromPayment(payment);
      if (sub?.created) {
        await prisma.adminActivity.create({
          data: {
            message: `New subscription purchase: ${sub.planName || "Unknown"} plan via GCash`,
            tone: "INFO",
          },
        });
        // Clear live expiry countdown after renew / purchase
        await prisma.notification.updateMany({
          where: {
            userId: payment.userId,
            dedupeKey: `owner_plan_live:${payment.userId}`,
            readAt: null,
          },
          data: { readAt: new Date() },
        });
        void createNotification({
          userId: payment.userId,
          type: "OWNER_PLAN_EXPIRING",
          title: "Gym subscription renewed",
          body: "Your gym subscription was renewed successfully.",
          data: {
            planName: sub.planName,
            daysLeft: sub.daysLeft,
          },
          dedupeKey: `owner_plan_renewed:${payment.referenceId}`,
        });
      }
      // Always refresh admin gyms/transactions when a plan payment succeeds
      void emitAdminGymsUpdated();
      return Boolean(sub);
    } catch (error) {
      console.error("activatePayment SUBSCRIPTION failed:", error);
      return false;
    }
  }

  if (payment.type === "MEMBERSHIP") {
    const gymId = meta.gymId as string | undefined;
    const planId = meta.planId as string | undefined;
    const coachId = (meta.coachId as string) || null;

    if (!gymId || !planId) {
      console.error("activatePayment MEMBERSHIP missing gymId/planId", meta);
      return false;
    }

    // Idempotent: same Xendit payment must not re-extend dates
    const alreadyActivated = await prisma.gymMembership.findFirst({
      where: {
        userId: payment.userId,
        gymId,
        paymentRef: payment.referenceId,
      },
      select: { id: true },
    });
    if (alreadyActivated) {
      await notifyMembershipChange(payment.userId, gymId);
      return true;
    }

    const existingApproval = await prisma.walkInApproval.findFirst({
      where: { paymentRef: payment.referenceId },
      select: { id: true },
    });
    if (existingApproval) {
      return true;
    }

    const plan = await prisma.membershipPlan.findUnique({ where: { id: planId } });
    if (!plan) {
      console.error("activatePayment MEMBERSHIP plan missing — cannot create membership", planId);
      return false;
    }

    const existingMembership = await prisma.gymMembership.findFirst({
      where: {
        userId: payment.userId,
        gymId,
        status: { in: ["ACTIVE", "EXPIRING"] },
        expiresAt: { gt: new Date() },
      },
      orderBy: { joinedAt: "desc" },
      select: { id: true },
    });

    // Renewal or new join via GCash → PENDING approval only (ACTIVE waits for Done)
    const user = await prisma.user.findUnique({
      where: { id: payment.userId },
      select: { fullName: true, email: true },
    });
    const coach = coachId
      ? await prisma.coach.findFirst({
          where: { id: coachId, gymId, isActive: true },
        })
      : null;

    await createPendingApproval({
      userId: payment.userId,
      gymId,
      planId: plan.id,
      planName: plan.name,
      planPrice: plan.price,
      memberName: user?.fullName || "Member",
      memberEmail: user?.email || "",
      coachId: coach?.id || null,
      coachName: coach?.name || null,
      coachSessionPrice: coach?.sessionPrice || 0,
      paymentRef: payment.referenceId,
      totalPaid: payment.amount,
      durationDays: plan.durationDays,
      isRenewal: Boolean(existingMembership),
      paymentMethod: "XENDIT",
    });
    return true;
  }

  return false;
}

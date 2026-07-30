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

/**
 * POST /api/payments/create-gcash
 * Creates a Xendit GCash payment request and returns the redirect URL.
 *
 * Body:
 *   - type: "SUBSCRIPTION" | "MEMBERSHIP"
 *   - amount: number
 *   - description: string
 *   - metadata: { planId, planName, months, gymId?, coachId?, ... }
 */
export async function createGcashPaymentHandler(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const { type, amount, description, metadata } = req.body;

    if (!type || !amount || amount <= 0) {
      sendError(res, "Invalid payment parameters");
      return;
    }

    if (!["SUBSCRIPTION", "MEMBERSHIP"].includes(type)) {
      sendError(res, "Payment type must be SUBSCRIPTION or MEMBERSHIP");
      return;
    }

    // Generate a unique reference ID
    const referenceId = `FF-${type.slice(0, 3)}-${Date.now()}-${Math.floor(
      Math.random() * 9000 + 1000
    )}`;

    const frontendUrl = env.FRONTEND_URL;

    // Build return URLs based on payment type
    let successUrl: string;
    let failureUrl: string;

    if (type === "SUBSCRIPTION") {
      successUrl = `${frontendUrl}/dashboard/user/create-gym/done?payment_id=PAYMENT_ID_PLACEHOLDER`;
      failureUrl = `${frontendUrl}/dashboard/user/create-gym/payment?payment_failed=true`;
    } else {
      const gymId = metadata?.gymId || "";
      successUrl = `${frontendUrl}/dashboard/user/gym/${gymId}/join/gcash/success?payment_id=PAYMENT_ID_PLACEHOLDER`;
      failureUrl = `${frontendUrl}/dashboard/user/gym/${gymId}/join/gcash?payment_failed=true`;
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

          // If payment succeeded, activate the subscription/membership
          if (isSucceeded) {
            await activatePayment(payment);
          }

          sendSuccess(res, {
            id: payment.id,
            status: isSucceeded ? "SUCCEEDED" : xenditStatus.status,
            referenceId: payment.referenceId,
            amount: payment.amount,
            paidAt: isSucceeded
              ? new Date().toISOString()
              : null,
          });
          return;
        }
      } catch (err) {
        console.error("Failed to poll Xendit status:", err);
        // Continue with cached status
      }
    }

    sendSuccess(res, {
      id: payment.id,
      status: payment.status,
      referenceId: payment.referenceId,
      amount: payment.amount,
      paidAt: payment.paidAt?.toISOString() || null,
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
        paidAt: isSuccess ? new Date() : null,
      },
    });

    // If payment succeeded, activate the subscription or membership
    if (isSuccess && payment.status !== "SUCCEEDED") {
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
 */
async function activatePayment(payment: {
  id: string;
  userId: string;
  type: string;
  amount: number;
  referenceId: string;
  metadata: unknown;
}): Promise<void> {
  const meta = payment.metadata as Record<string, unknown>;

  if (payment.type === "SUBSCRIPTION") {
    // Create owner subscription
    const months = (meta.months as number) || 1;
    const validUntil = new Date();
    validUntil.setMonth(validUntil.getMonth() + months);

    await prisma.ownerSubscription.create({
      data: {
        ownerId: payment.userId,
        planId: (meta.planId as string) || "",
        planName: (meta.planName as string) || "",
        price: payment.amount,
        months,
        referenceNo: payment.referenceId,
        method: "Xendit",
        validUntil,
      },
    });

    // Update user role to OWNER
    await prisma.user.update({
      where: { id: payment.userId },
      data: { role: "OWNER" },
    });

    // Record admin activity
    await prisma.adminActivity.create({
      data: {
        message: `New subscription purchase: ${meta.planName || "Unknown"} plan via GCash`,
        tone: "INFO",
      },
    });
  } else if (payment.type === "MEMBERSHIP") {
    // Create gym membership
    const gymId = meta.gymId as string;
    const planId = meta.planId as string;
    const coachId = (meta.coachId as string) || null;

    const plan = await prisma.membershipPlan.findUnique({
      where: { id: planId },
    });

    if (plan && gymId) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + plan.durationDays);

      await prisma.gymMembership.create({
        data: {
          userId: payment.userId,
          gymId,
          planId,
          coachId,
          paymentMethod: "XENDIT",
          paymentRef: payment.referenceId,
          totalPaid: payment.amount,
          status: "ACTIVE",
          expiresAt,
        },
      });
    }
  }
}

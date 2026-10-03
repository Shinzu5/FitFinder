import { Request, Response } from "express";
import { sendSuccess, sendError, sendCreated } from "@/utils/apiResponse";
import { AuthRequest } from "@/types/common";
import { CheckPaymentStatusService, ProcessXenditWebhookService, StartGcashPaymentService } from "@/services/payment";

export class PaymentController {
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
  public createGcashPaymentHandler = async (
    req: AuthRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { type, amount, description, metadata } = req.body;

      const result = await StartGcashPaymentService({
        userId: req.userId,
        type,
        amount,
        description,
        metadata,
      });

      if (result.kind === "error") {
        sendError(res, result.message, result.status);
        return;
      }

      sendCreated(
        res,
        {
          paymentId: result.paymentId,
          xenditPaymentId: result.xenditPaymentId,
          referenceId: result.referenceId,
          redirectUrl: result.redirectUrl,
          status: "PENDING",
        },
        "GCash payment created — redirect user to authorize"
      );
    } catch (error) {
      console.error("Create GCash payment error:", error);
      sendError(res, "Failed to create GCash payment", 500);
    }
  };

  /**
   * GET /api/payments/:id/status
   * Check payment status (frontend polls this after redirect).
   * On SUCCEEDED, always re-runs activation (idempotent) so membership unlocks even if the first attempt failed.
   */
  public checkPaymentStatus = async (
    req: AuthRequest,
    res: Response
  ): Promise<void> => {
    try {
      const id = String(req.params.id);

      const result = await CheckPaymentStatusService(id);

      if (result.kind === "not-found") {
        sendError(res, "Payment not found", 404);
        return;
      }

      const { payment, status, paidAt, membershipActive, subscription, authPayload } =
        result;

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
  };

  /**
   * POST /api/payments/xendit-webhook
   * Receive and process Xendit webhook callbacks.
   * This is called by Xendit when a payment status changes.
   */
  public xenditWebhook = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const rawCallbackToken = req.headers["x-callback-token"];
      const callbackToken = typeof rawCallbackToken === "string" ? rawCallbackToken : "";
      const { event, data } = req.body;

      const result = await ProcessXenditWebhookService({ callbackToken, event, data });

      if (result.kind === "invalid-token") {
        res.status(403).json({ error: "Invalid callback token" });
        return;
      }

      if (result.kind === "invalid-payload") {
        res.status(400).json({ error: "Invalid webhook payload" });
        return;
      }

      if (result.kind === "not-found") {
        res.status(200).json({ received: true }); // Don't retry
        return;
      }

      res.status(200).json({ received: true });
    } catch (error) {
      console.error("Xendit webhook error:", error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  };
}

export default new PaymentController();

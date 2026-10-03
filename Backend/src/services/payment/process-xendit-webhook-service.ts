import { SubscriptionRepository } from "@/repositories/subscription.repository";
import { ActivatePaymentService as activatePayment } from "@/services/payment/activate-payment-service";
import { VerifyWebhookTokenService as verifyWebhookToken } from "@/services/payment/verify-webhook-token-service";

const subscriptionRepository = new SubscriptionRepository();

type ProcessWebhookResult =
  | { kind: "invalid-token" }
  | { kind: "invalid-payload" }
  | { kind: "not-found" }
  | { kind: "ok" };

/**
 * POST /api/payments/xendit-webhook — verify the callback, sync the payment
 * status from the event and activate on success (idempotent for retries).
 */
export async function ProcessXenditWebhookService(input: {
  callbackToken: string;
  event?: string;
  data?: any;
}): Promise<ProcessWebhookResult> {
  const { callbackToken, event, data } = input;

  if (!verifyWebhookToken(callbackToken)) {
    console.warn("Invalid Xendit webhook token");
    return { kind: "invalid-token" };
  }

  if (!data?.id) {
    return { kind: "invalid-payload" };
  }

  // Find the payment by Xendit payment ID
  const payment = await subscriptionRepository.findByXenditIdOrReference(
    data.id,
    data.reference_id,
  );

  if (!payment) {
    console.warn("Webhook: payment not found for", data.id);
    return { kind: "not-found" };
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

  await subscriptionRepository.updateStatusById(payment.id, {
    status: newStatus,
    paidAt: isSuccess ? payment.paidAt || new Date() : null,
  });

  // Always attempt activation on success (idempotent) — covers first webhook and retries
  if (isSuccess) {
    await activatePayment(payment);
  }

  return { kind: "ok" };
}

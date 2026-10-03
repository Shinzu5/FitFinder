import { SubscriptionRepository } from "@/repositories/subscription.repository";
import { GetPaymentStatusService as getPaymentStatus } from "@/services/payment/get-payment-status-service";

const subscriptionRepository = new SubscriptionRepository();

/**
 * Poll Xendit for the latest status of a PENDING payment and persist a change.
 * Returns the effective status / paidAt (unchanged when Xendit has no update).
 * Moved out of payment.controller checkPaymentStatus — no DB access in controllers.
 */
export async function SyncPaymentStatusService(payment: {
  id: string;
  status: string;
  paidAt: Date | null;
  xenditPaymentId: string;
}): Promise<{ status: string; paidAt: Date | null }> {
  let status = payment.status;
  let paidAt = payment.paidAt;

  if (payment.status === "PENDING") {
    try {
      const xenditStatus = await getPaymentStatus(payment.xenditPaymentId);

      if (xenditStatus.status !== payment.status) {
        const isSucceeded =
          xenditStatus.status === "SUCCEEDED" ||
          xenditStatus.status === "COMPLETED";

        await subscriptionRepository.updateStatusById(payment.id, {
          status: isSucceeded ? "SUCCEEDED" : xenditStatus.status,
          paidAt: isSucceeded ? new Date() : null,
        });

        status = isSucceeded ? "SUCCEEDED" : xenditStatus.status;
        paidAt = isSucceeded ? new Date() : null;
      }
    } catch (err) {
      console.error("Failed to poll Xendit status:", err);
    }
  }

  return { status, paidAt };
}

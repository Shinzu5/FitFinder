import { SubscriptionRepository } from "@/repositories/subscription.repository";
import { EmitAdminGymsUpdatedService as emitAdminGymsUpdated } from "@/services/realtime/emit-admin-gyms-updated-service";
import { EnsureOwnerSubscriptionFromPaymentService as ensureOwnerSubscriptionFromPayment } from "@/services/subscription/ensure-owner-subscription-from-payment-service";
import { DedupeOwnerSubscriptionsByReferenceService as dedupeOwnerSubscriptionsByReference } from "@/services/subscription/dedupe-owner-subscriptions-by-reference-service";
import { LinkUnlinkedSubscriptionsToGymsService as linkUnlinkedSubscriptionsToGyms } from "@/services/subscription/link-unlinked-subscriptions-to-gyms-service";

const subscriptionRepository = new SubscriptionRepository();

/** Repair missing OwnerSubscription rows from SUCCEEDED Xendit payments. */
export async function BackfillOwnerSubscriptionsFromPaymentsService(): Promise<number> {
  await dedupeOwnerSubscriptionsByReference();

  const payments = await subscriptionRepository.listSucceededSubscriptionsAsc();

  let created = 0;
  for (const payment of payments) {
    const result = await ensureOwnerSubscriptionFromPayment(payment, {
      stack: false,
      emit: false,
    });
    if (result?.created) created += 1;
  }

  await linkUnlinkedSubscriptionsToGyms();

  if (created > 0) {
    void emitAdminGymsUpdated();
  }

  return created;
}

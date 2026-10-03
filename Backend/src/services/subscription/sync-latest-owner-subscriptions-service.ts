import { SubscriptionRepository } from "@/repositories/subscription.repository";
import { EmitAdminGymsUpdatedService as emitAdminGymsUpdated } from "@/services/realtime/emit-admin-gyms-updated-service";
import { EnsureOwnerSubscriptionFromPaymentService as ensureOwnerSubscriptionFromPayment } from "@/services/subscription/ensure-owner-subscription-from-payment-service";
import { DedupeOwnerSubscriptionsByReferenceService as dedupeOwnerSubscriptionsByReference } from "@/services/subscription/dedupe-owner-subscriptions-by-reference-service";
import { LinkUnlinkedSubscriptionsToGymsService as linkUnlinkedSubscriptionsToGyms } from "@/services/subscription/link-unlinked-subscriptions-to-gyms-service";

const subscriptionRepository = new SubscriptionRepository();

/**
 * Lightweight heal for admin views: dedupe, then ensure each owner's latest SUCCEEDED
 * payment has an OwnerSubscription row.
 */
export async function SyncLatestOwnerSubscriptionsService(): Promise<number> {
  await dedupeOwnerSubscriptionsByReference();

  const payments = await subscriptionRepository.listSucceededSubscriptionsDesc();

  const seenOwners = new Set<string>();
  let created = 0;

  for (const payment of payments) {
    if (seenOwners.has(payment.userId)) continue;
    seenOwners.add(payment.userId);

    const result = await ensureOwnerSubscriptionFromPayment(payment, {
      stack: false,
      emit: false,
    });
    if (result?.created) created += 1;
  }

  await linkUnlinkedSubscriptionsToGyms();
  return created;
}

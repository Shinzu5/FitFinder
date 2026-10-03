import { SubscriptionRepository } from "@/repositories/subscription.repository";
import { EmitAdminGymsUpdatedService as emitAdminGymsUpdated } from "@/services/realtime/emit-admin-gyms-updated-service";

const subscriptionRepository = new SubscriptionRepository();

/** Remove duplicate OwnerSubscription rows that share the same referenceNo (legacy race). */
export async function DedupeOwnerSubscriptionsByReferenceService(): Promise<number> {
  const duplicates = await subscriptionRepository.findDuplicateReferenceNos();

  let removed = 0;
  for (const dup of duplicates) {
    const rows = await subscriptionRepository.listByReferenceNo(dup.referenceNo);
    // Keep the earliest (correct non-stacked) row; delete the rest
    const [, ...extras] = rows;
    for (const extra of extras) {
      await subscriptionRepository.deleteSubscriptionById(extra.id);
      removed += 1;
    }
  }

  if (removed > 0) {
    void emitAdminGymsUpdated();
  }
  return removed;
}

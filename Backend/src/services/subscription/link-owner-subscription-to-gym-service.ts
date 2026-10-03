import { SubscriptionRepository } from "@/repositories/subscription.repository";

const subscriptionRepository = new SubscriptionRepository();

/** Attach the owner's latest plan to a gym (used on gym create). */
export async function LinkOwnerSubscriptionToGymService(
  ownerId: string,
  gymId: string,
  subscriptionId?: string | null,
): Promise<void> {
  if (subscriptionId) {
    await subscriptionRepository.linkGymById(subscriptionId, ownerId, gymId);
    return;
  }

  const latest = await subscriptionRepository.findLatestByOwner(ownerId);
  if (latest) {
    await subscriptionRepository.updateGymById(latest.id, gymId);
  }
}

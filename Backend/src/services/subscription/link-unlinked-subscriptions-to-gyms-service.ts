import { SubscriptionRepository } from "@/repositories/subscription.repository";
import { GymRepository } from "@/repositories/gym.repository";

const subscriptionRepository = new SubscriptionRepository();
const gymRepository = new GymRepository();

export async function LinkUnlinkedSubscriptionsToGymsService(): Promise<void> {
  const unlinked = await subscriptionRepository.listUnlinked();
  for (const sub of unlinked) {
    const gym = await gymRepository.findLatestIdByOwner(sub.ownerId);
    if (gym) {
      await subscriptionRepository.updateGymById(sub.id, gym.id);
    }
  }
}

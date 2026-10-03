import { SubscriptionRepository } from "@/repositories/subscription.repository";

const subscriptionRepository = new SubscriptionRepository();

/** GET /api/subscriptions/my-plan — newest paid owner subscription with its gym. */
export async function GetMyPlanService(ownerId: string) {
  return subscriptionRepository.findLatestByOwnerWithGym(ownerId);
}

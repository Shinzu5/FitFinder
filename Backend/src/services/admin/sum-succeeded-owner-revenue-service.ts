import { SubscriptionRepository } from "@/repositories/subscription.repository";

const subscriptionRepository = new SubscriptionRepository();

export async function SumSucceededOwnerRevenueService(from?: Date) {
  return from
    ? subscriptionRepository.sumSucceededRevenueSince(from)
    : subscriptionRepository.sumSucceededRevenue();
}

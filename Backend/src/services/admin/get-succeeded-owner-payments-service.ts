import { SubscriptionRepository } from "@/repositories/subscription.repository";

const subscriptionRepository = new SubscriptionRepository();

/** Platform revenue = SUCCEEDED owner-plan Xendit payments (never wiped on gym delete). */
export async function GetSucceededOwnerPaymentsService() {
  return subscriptionRepository.listSucceededWithUser();
}

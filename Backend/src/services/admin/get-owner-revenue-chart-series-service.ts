import { SubscriptionRepository } from "@/repositories/subscription.repository";
import { buildRevenueChartSeries } from "@/utils/adminRevenue";

const subscriptionRepository = new SubscriptionRepository();

export async function GetOwnerRevenueChartSeriesService(now = new Date()) {
  const yearAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const payments = await subscriptionRepository.listSucceededSince(yearAgo);

  return buildRevenueChartSeries(
    payments
      .filter((p) => p.paidAt)
      .map((p) => ({ paidAt: p.paidAt as Date, price: p.amount })),
    now,
  );
}

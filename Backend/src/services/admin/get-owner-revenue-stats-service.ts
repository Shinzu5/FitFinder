import { SubscriptionRepository } from "@/repositories/subscription.repository";
import { SumSucceededOwnerRevenueService as sumSucceededOwnerRevenue } from "@/services/admin/sum-succeeded-owner-revenue-service";

const subscriptionRepository = new SubscriptionRepository();

export async function GetOwnerRevenueStatsService(now = new Date()) {
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [today, thisWeek, thisMonth, prevMonth, total] = await Promise.all([
    sumSucceededOwnerRevenue(startOfDay),
    sumSucceededOwnerRevenue(startOfWeek),
    sumSucceededOwnerRevenue(startOfMonth),
    subscriptionRepository.sumSucceededRevenueBetween(prevMonthStart, startOfMonth),
    sumSucceededOwnerRevenue(),
  ]);

  return {
    today,
    thisWeek,
    thisMonth,
    prevMonth,
    total,
  };
}

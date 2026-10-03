import { AdminRepository } from "@/repositories/admin.repository";
import { daysRemainingUntil } from "@/utils/ownerPlan";
import {
  HealOwnerSubscriptionDurationsService as healOwnerSubscriptionDurations,
  SyncLatestOwnerSubscriptionsService as syncLatestOwnerSubscriptions,
} from "@/services/subscription";
import { GetOwnerRevenueChartSeriesService as getOwnerRevenueChartSeries } from "@/services/admin/get-owner-revenue-chart-series-service";
import { GetOwnerRevenueStatsService as getOwnerRevenueStats } from "@/services/admin/get-owner-revenue-stats-service";

const adminRepository = new AdminRepository();

/**
 * GET /api/admin/dashboard — platform counters, revenue, activity feed and
 * plan/gym status (pending gyms auto-activated first, durations healed).
 */
export async function GetAdminDashboardService() {
  await adminRepository.activatePendingGyms();

  // Unstack any legacy leftover days so plan duration matches remaining days
  try {
    await healOwnerSubscriptionDurations();
  } catch (healError) {
    console.error("Dashboard duration heal failed:", healError);
  }

  const now = new Date();

  const [
    totalUsers,
    totalGyms,
    activities,
    revenueStats,
    revenueChart,
    latestSubsForStatus,
  ] = await Promise.all([
    adminRepository.countUsers(),
    adminRepository.countActiveGyms(),
    adminRepository.listRecentActivities(20),
    // Revenue from SUCCEEDED Xendit owner-plan payments (source of truth)
    getOwnerRevenueStats(now),
    getOwnerRevenueChartSeries(now),
    adminRepository.listOwnerSubscriptionsLatest(),
  ]);

  const latestValidByOwner = new Map<string, Date>();
  for (const sub of latestSubsForStatus) {
    if (!latestValidByOwner.has(sub.ownerId)) {
      latestValidByOwner.set(sub.ownerId, sub.validUntil);
    }
  }
  let activePlanCount = 0;
  let expiredPlanCount = 0;
  for (const until of latestValidByOwner.values()) {
    if (daysRemainingUntil(until, now) > 0) activePlanCount += 1;
    else expiredPlanCount += 1;
  }

  const platformRevenue = revenueStats.total;

  // Active gyms = published gyms whose owner's latest plan is not expired
  const gyms = await adminRepository.listActiveGymOwnerRefs();
  const ownerIds = [...new Set(gyms.map((g) => g.ownerId))];
  const ownerSubs = ownerIds.length
    ? await adminRepository.listOwnerSubscriptionsByOwners(ownerIds)
    : [];
  const latestByOwnerId = new Map<string, Date>();
  for (const sub of ownerSubs) {
    if (!latestByOwnerId.has(sub.ownerId)) {
      latestByOwnerId.set(sub.ownerId, sub.validUntil);
    }
  }
  const activeGyms = gyms.filter((g) => {
    const until = latestByOwnerId.get(g.ownerId);
    return until ? daysRemainingUntil(until, now) > 0 : false;
  }).length;

  return {
    totalUsers,
    totalGyms,
    activeGyms,
    activePlanCount,
    expiredPlanCount,
    platformRevenue,
    revenueStats,
    revenueChart,
    activities,
  };
}

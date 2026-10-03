import { AdminRepository } from "@/repositories/admin.repository";
import { GetOwnerRevenueChartSeriesService as getOwnerRevenueChartSeries } from "@/services/admin/get-owner-revenue-chart-series-service";
import { GetOwnerRevenueStatsService as getOwnerRevenueStats } from "@/services/admin/get-owner-revenue-stats-service";

const adminRepository = new AdminRepository();

/**
 * GET /api/admin/analytics — Neon-backed platform analytics (no mocks).
 * Supplies every count/series row; growth math stays with the caller.
 */
export async function GetAdminAnalyticsService() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [
    totalUsers,
    totalOwners,
    totalGyms,
    activeMembers,
    newUsersThisMonth,
    newUsersPrevMonth,
    newGymsThisMonth,
    revenueStats,
    revenueChart,
    topGymsRaw,
    roleCounts,
    membershipJoins,
    latestSubsForActivePlans,
  ] = await Promise.all([
    adminRepository.countUsers(),
    adminRepository.countOwners(),
    adminRepository.countActiveGyms(),
    adminRepository.countLiveMemberships(),
    adminRepository.countUsersSince(startOfMonth),
    adminRepository.countUsersBetween(prevMonthStart, startOfMonth),
    adminRepository.countActiveGymsSince(startOfMonth),
    getOwnerRevenueStats(now),
    getOwnerRevenueChartSeries(now),
    adminRepository.listTopGymCandidates(),
    adminRepository.groupUsersByRole(),
    adminRepository.listMembershipJoinDates(
      new Date(now.getFullYear(), now.getMonth() - 5, 1),
    ),
    adminRepository.listOwnerSubscriptionsLatest(),
  ]);

  return {
    now,
    startOfMonth,
    prevMonthStart,
    totalUsers,
    totalOwners,
    totalGyms,
    activeMembers,
    newUsersThisMonth,
    newUsersPrevMonth,
    newGymsThisMonth,
    revenueStats,
    revenueChart,
    topGymsRaw,
    roleCounts,
    membershipJoins,
    latestSubsForActivePlans,
  };
}

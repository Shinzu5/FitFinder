import { ClerkRepository } from "@/repositories/clerk.repository";
import { MembershipRepository } from "@/repositories/membership.repository";
import { CountActiveNowService as countActiveNow } from "@/services/attendance/count-active-now-service";
import { MONTH_LABELS } from "@/services/clerk/clerk-date-utils";

const clerkRepository = new ClerkRepository();
const membershipRepository = new MembershipRepository();

/**
 * GET /api/clerk/dashboard — today's take, monthly revenue, 5-month chart,
 * new members today and the live check-in count (one fan-out).
 */
export async function GetClerkDashboardService(gymId: string) {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  // Last 5 calendar months including current (matches existing chart slots)
  const chartStart = new Date(now.getFullYear(), now.getMonth() - 4, 1);

  const [todayTxns, monthSum, chartTxns, newMembersToday, activeNow] =
    await Promise.all([
      clerkRepository.listTodayAmounts(gymId, startOfDay),
      clerkRepository.sumMonthAmount(gymId, startOfMonth),
      clerkRepository.listChartAmounts(gymId, chartStart),
      membershipRepository.countJoinedSinceByGym(gymId, startOfDay),
      // Currently checked-in members + walk-in visitors (not membership count)
      countActiveNow(gymId),
    ]);

  const revenueToday = todayTxns.reduce((sum, txn) => sum + txn.amount, 0);
  const monthlyRevenue = monthSum._sum.amount ?? 0;

  const monthBuckets = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 4 + i, 1);
    return {
      key: `${d.getFullYear()}-${d.getMonth()}`,
      month: MONTH_LABELS[d.getMonth()],
      total: 0,
    };
  });
  const bucketMap = new Map(monthBuckets.map((b) => [b.key, b]));
  for (const txn of chartTxns) {
    const d = new Date(txn.createdAt);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const bucket = bucketMap.get(key);
    if (bucket) bucket.total += txn.amount;
  }

  return {
    todayCount: todayTxns.length,
    revenueToday,
    monthlyRevenue,
    revenueByMonth: monthBuckets.map((b) => ({
      month: b.month,
      // Chart axis is ₱k
      value: Math.round((b.total / 1000) * 10) / 10,
      total: b.total,
    })),
    newMembersToday,
    activeNow,
  };
}

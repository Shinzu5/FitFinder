import { Response } from "express";
import { sendSuccess, sendError } from "@/utils/apiResponse";
import { AuthRequest } from "@/types/common";
import { daysRemainingUntil, storedDurationToDays } from "@/utils/ownerPlan";
import { getOwnerPlanById } from "@/config/ownerPlans";
import {
  BuildAdminTransactionRowsService,
  GetAdminAnalyticsService,
  GetAdminDashboardService,
  GetAdminUserDetailService,
  GetOwnerRevenueStatsService,
  ListAdminGymsService,
  ListAdminUsersService,
  RemoveAdminUserService,
} from "@/services/admin";

export class AdminController {
  // GET /api/admin/dashboard
  public getDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const dashboard = await GetAdminDashboardService();

      sendSuccess(res, {
        totalUsers: dashboard.totalUsers,
        totalGyms: dashboard.totalGyms,
        activeGyms: dashboard.activeGyms,
        activeSubscriptions: dashboard.activePlanCount,
        expiredSubscriptions: dashboard.expiredPlanCount,
        platformRevenue: dashboard.platformRevenue,
        revenueStats: {
          today: dashboard.revenueStats.today,
          thisWeek: dashboard.revenueStats.thisWeek,
          thisMonth: dashboard.revenueStats.thisMonth,
          total: dashboard.platformRevenue,
        },
        revenueChart: dashboard.revenueChart,
        activity: dashboard.activities.map((a) => ({
          id: a.id,
          message: a.message,
          tone: a.tone,
          createdAt: a.createdAt.toISOString(),
        })),
      });
    } catch (error) {
      console.error("Admin dashboard error:", error);
      sendError(res, "Failed to fetch dashboard", 500);
    }
  };

  // GET /api/admin/users
  public getUsers = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { users, activeMemberSet, latestOwnerSub, now } = await ListAdminUsersService(
        req.query.role,
      );

      sendSuccess(
        res,
        users.map((user) => {
          let status: "active" | "inactive" | "expired" = "inactive";

          if (!user.emailVerified) {
            status = "inactive";
          } else if (user.role === "USER") {
            // Gymer: active only while they have a live gym membership
            status = activeMemberSet.has(user.id) ? "active" : "expired";
          } else if (user.role === "OWNER") {
            const validUntil = latestOwnerSub.get(user.id);
            status =
              validUntil && daysRemainingUntil(validUntil, now) > 0
                ? "active"
                : "expired";
          } else if (user.role === "CLERK") {
            status = user.clerkGymId ? "active" : "inactive";
          } else {
            status = "active";
          }

          return {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            avatarUrl: user.avatarUrl,
            createdAt: user.createdAt,
            emailVerified: user.emailVerified,
            clerkGymId: user.clerkGymId,
            gymName: user.clerkOfGym?.name ?? null,
            gymOwnerName: user.clerkOfGym?.owner?.fullName ?? null,
            hasActiveMembership: activeMemberSet.has(user.id),
            status,
          };
        }),
      );
    } catch (error) {
      console.error("Get users error:", error);
      sendError(res, "Failed to fetch users", 500);
    }
  };

  // GET /api/admin/users/:id — profile + gym membership history for View modal
  public getUserDetail = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = String(req.params.id);
      const detail = await GetAdminUserDetailService(userId);

      if (!detail.user) {
        sendError(res, "User not found", 404);
        return;
      }

      const { user, memberships, approvals, now } = detail;

      const gymRows: Array<{
        gymId: string;
        gymName: string;
        planName: string;
        planType: string;
        remainingDays: number | null;
        status: "Pending" | "Active" | "Expired" | "Cancelled";
        source: "membership" | "approval";
        joinedAt: string | null;
        expiresAt: string | null;
      }> = [];

      for (const m of memberships) {
        const remaining = daysRemainingUntil(m.expiresAt, now);
        const live =
          (m.status === "ACTIVE" || m.status === "EXPIRING") && remaining > 0;
        gymRows.push({
          gymId: m.gymId,
          gymName: m.gym.name,
          planName: m.planName || m.plan?.name || "Plan",
          planType:
            String(m.memberType || "").toUpperCase() === "ONLINE"
              ? "Online"
              : "Walk-in",
          remainingDays: live ? remaining : 0,
          status: live ? "Active" : "Expired",
          source: "membership",
          joinedAt: m.joinedAt.toISOString(),
          expiresAt: m.expiresAt.toISOString(),
        });
      }

      for (const a of approvals) {
        if (a.status === "PENDING") {
          gymRows.push({
            gymId: a.gymId,
            gymName: a.gym.name,
            planName: a.planName || "Plan",
            planType:
              String(a.paymentMethod || "").toUpperCase() === "XENDIT"
                ? "Online"
                : "Walk-in",
            remainingDays: null,
            status: "Pending",
            source: "approval",
            joinedAt: a.submittedAt.toISOString(),
            expiresAt: null,
          });
        } else if (a.status === "DECLINED") {
          gymRows.push({
            gymId: a.gymId,
            gymName: a.gym.name,
            planName: a.planName || "Plan",
            planType:
              String(a.paymentMethod || "").toUpperCase() === "XENDIT"
                ? "Online"
                : "Walk-in",
            remainingDays: null,
            status: "Cancelled",
            source: "approval",
            joinedAt: a.submittedAt.toISOString(),
            expiresAt: null,
          });
        }
      }

      sendSuccess(res, {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt.toISOString(),
        emailVerified: user.emailVerified,
        clerkGymId: user.clerkGymId,
        gymName: user.clerkOfGym?.name ?? null,
        gymOwnerName: user.clerkOfGym?.owner?.fullName ?? null,
        gyms: gymRows,
      });
    } catch (error) {
      console.error("Get user detail error:", error);
      sendError(res, "Failed to fetch user details", 500);
    }
  };

  // DELETE /api/admin/users/:id
  public removeUser = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const targetId = String(req.params.id);
      const result = await RemoveAdminUserService(targetId);

      if (result.kind === "not-found") {
        sendError(res, "User not found", 404);
        return;
      }

      if (result.kind === "clerk-guard") {
        sendError(res, "Clerk accounts can only be removed by their Gym Owner", 403);
        return;
      }

      if (result.kind === "error") {
        sendError(res, result.message, result.status);
        return;
      }

      sendSuccess(res, null, "User removed");
    } catch (error) {
      console.error("Remove user error:", error);
      sendError(res, "Failed to remove user", 500);
    }
  };

  // GET /api/admin/gyms — active gyms + latest owner plan (accurate DB data)
  public getAdminGyms = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { gyms, latestByOwnerId, pendingOwnerSet, now } = await ListAdminGymsService();

      const result = gyms.map((gym) => {
        const sub = latestByOwnerId.get(gym.ownerId) || null;
        const planDaysLeft = sub ? daysRemainingUntil(sub.validUntil, now) : null;
        const keyOk =
          (gym.xenditApiKey || "").startsWith("xnd_production_") ||
          (gym.xenditApiKey || "").startsWith("xnd_development_");

        let subscriptionStatus: "active" | "expired" | "pending" | "none" = "none";
        if (sub) {
          subscriptionStatus = planDaysLeft === 0 ? "expired" : "active";
        } else if (pendingOwnerSet.has(gym.ownerId)) {
          subscriptionStatus = "pending";
        }

        const gymStatus: "active" | "expired" | "pending" =
          subscriptionStatus === "active"
            ? "active"
            : subscriptionStatus === "expired"
              ? "expired"
              : "pending";

        const catalog = sub ? getOwnerPlanById(sub.planId) : null;
        const durationDays = sub
          ? catalog?.days ?? storedDurationToDays(sub.months)
          : null;

        return {
          id: gym.id,
          name: gym.name,
          location: gym.address,
          imageUrl: gym.coverImageUrl,
          members: gym._count.gymMemberships,
          status: gymStatus,
          publishedStatus: "published",
          ownerName: gym.owner.fullName,
          ownerEmail: gym.owner.email,
          paymentConfigured: Boolean(gym.xenditEnabled && keyOk),
          planName: catalog?.name || sub?.planName || null,
          planPrice: catalog?.price ?? sub?.price ?? null,
          planMonths: durationDays,
          planDurationDays: durationDays,
          planPaidAt: sub?.paidAt?.toISOString() || null,
          planValidUntil: sub?.validUntil?.toISOString() || null,
          planDaysLeft,
          planExpired: sub ? planDaysLeft === 0 : null,
          subscriptionStatus,
          subscriptionStartDate: sub?.paidAt?.toISOString() || null,
          subscriptionExpirationDate: sub?.validUntil?.toISOString() || null,
          remainingDays: planDaysLeft,
        };
      });

      sendSuccess(res, result);
    } catch (error) {
      console.error("Get admin gyms error:", error);
      sendError(res, "Failed to fetch gyms", 500);
    }
  };

  // GET /api/admin/analytics — Neon-backed platform analytics (no mocks)
  public getAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const analytics = await GetAdminAnalyticsService();
      const {
        now,
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
      } = analytics;

      const platformRevenue = revenueStats.total;
      const monthRevenue = revenueStats.thisMonth;
      const prevMonthRevenue = revenueStats.prevMonth;

      const latestPlanByOwner = new Map<string, Date>();
      for (const sub of latestSubsForActivePlans) {
        if (!latestPlanByOwner.has(sub.ownerId)) {
          latestPlanByOwner.set(sub.ownerId, sub.validUntil);
        }
      }
      let activeOwnerSubs = 0;
      for (const until of latestPlanByOwner.values()) {
        if (daysRemainingUntil(until, now) > 0) activeOwnerSubs += 1;
      }

      const userGrowthPct =
        newUsersPrevMonth === 0
          ? newUsersThisMonth > 0
            ? 100
            : 0
          : Math.round(((newUsersThisMonth - newUsersPrevMonth) / newUsersPrevMonth) * 1000) / 10;

      const revenueGrowthPct =
        prevMonthRevenue === 0
          ? monthRevenue > 0
            ? 100
            : 0
          : Math.round(((monthRevenue - prevMonthRevenue) / prevMonthRevenue) * 1000) / 10;

      const membershipGrowth: { label: string; value: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        const count = membershipJoins.filter(
          (row) => row.joinedAt >= m && row.joinedAt < next,
        ).length;
        membershipGrowth.push({
          label: m.toLocaleDateString("en-US", { month: "short" }),
          value: count,
        });
      }

      const topGyms = topGymsRaw
        .map((g) => ({
          id: g.id,
          name: g.name,
          location: g.address,
          imageUrl: g.coverImageUrl,
          members: g._count.gymMemberships,
        }))
        .sort((a, b) => b.members - a.members)
        .slice(0, 10);

      const usersByRole: Record<string, number> = Object.fromEntries(
        roleCounts.map((r) => [r.role, r._count._all]),
      );

      sendSuccess(res, {
        metrics: {
          totalUsers,
          totalOwners,
          totalGyms,
          activeMembers,
          activeSubscriptions: activeOwnerSubs,
          platformRevenue,
          monthRevenue,
          newUsersThisMonth,
          newGymsThisMonth,
          userGrowthPct,
          revenueGrowthPct,
        },
        revenueChart,
        membershipGrowth,
        topGyms,
        usersByRole,
      });
    } catch (error) {
      console.error("Get admin analytics error:", error);
      sendError(res, "Failed to fetch analytics", 500);
    }
  };

  // GET /api/admin/transactions
  public getTransactions = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const now = new Date();
      const [result, revenueStats] = await Promise.all([
        BuildAdminTransactionRowsService(now),
        GetOwnerRevenueStatsService(now),
      ]);

      sendSuccess(res, {
        transactions: result,
        stats: {
          today: revenueStats.today,
          thisWeek: revenueStats.thisWeek,
          thisMonth: revenueStats.thisMonth,
          total: revenueStats.total,
        },
      });
    } catch (error) {
      console.error("Get transactions error:", error);
      sendError(res, "Failed to fetch transactions", 500);
    }
  };
}

export default new AdminController();

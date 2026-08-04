import { Response } from "express";
import prisma from "../config/database";
import { sendSuccess, sendError } from "../utils/apiResponse";
import { AuthRequest } from "../middleware/auth";
import { daysRemainingUntil, storedDurationToDays } from "../utils/ownerPlan";
import {
  healOwnerSubscriptionDurations,
  syncLatestOwnerSubscriptions,
} from "../services/ownerSubscription.service";
import { getOwnerPlanById } from "../config/ownerPlans";
import {
  buildAdminTransactionRows,
  getOwnerRevenueChartSeries,
  getOwnerRevenueStats,
} from "../services/adminRevenue.service";
import { permanentlyDeleteUser } from "../services/accountRemoval.service";

// GET /api/admin/dashboard
export async function getDashboard(req: AuthRequest, res: Response): Promise<void> {
  try {
    await prisma.gym.updateMany({
      where: { status: "PENDING" },
      data: { status: "ACTIVE" },
    });

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
      prisma.user.count(),
      prisma.gym.count({ where: { status: "ACTIVE" } }),
      prisma.adminActivity.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
      // Revenue from SUCCEEDED Xendit owner-plan payments (source of truth)
      getOwnerRevenueStats(now),
      getOwnerRevenueChartSeries(now),
      prisma.ownerSubscription.findMany({
        orderBy: { paidAt: "desc" },
        select: { ownerId: true, validUntil: true },
      }),
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
    const gyms = await prisma.gym.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, ownerId: true },
    });
    const ownerIds = [...new Set(gyms.map((g) => g.ownerId))];
    const ownerSubs = ownerIds.length
      ? await prisma.ownerSubscription.findMany({
          where: { ownerId: { in: ownerIds } },
          orderBy: { paidAt: "desc" },
          select: { ownerId: true, validUntil: true },
        })
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

    sendSuccess(res, {
      totalUsers,
      totalGyms,
      activeGyms,
      activeSubscriptions: activePlanCount,
      expiredSubscriptions: expiredPlanCount,
      platformRevenue,
      revenueStats: {
        today: revenueStats.today,
        thisWeek: revenueStats.thisWeek,
        thisMonth: revenueStats.thisMonth,
        total: platformRevenue,
      },
      revenueChart,
      activity: activities.map((a) => ({
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
}

// GET /api/admin/users
export async function getUsers(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { role } = req.query;

    const where: any = {};
    if (role && typeof role === "string") {
      where.role = role.toUpperCase();
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
        emailVerified: true,
        clerkGymId: true,
        clerkOfGym: {
          select: {
            id: true,
            name: true,
            owner: { select: { id: true, fullName: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const now = new Date();
    const ownerIds = users.filter((u) => u.role === "OWNER").map((u) => u.id);
    const gymerIds = users.filter((u) => u.role === "USER").map((u) => u.id);

    // Mark overdue gym memberships expired before status checks
    if (gymerIds.length > 0) {
      await prisma.gymMembership.updateMany({
        where: {
          userId: { in: gymerIds },
          status: { in: ["ACTIVE", "EXPIRING"] },
          expiresAt: { lt: now },
        },
        data: { status: "EXPIRED" },
      });
    }

    const [activeMemberships, ownerSubscriptions] = await Promise.all([
      gymerIds.length
        ? prisma.gymMembership.findMany({
            where: {
              userId: { in: gymerIds },
              status: { in: ["ACTIVE", "EXPIRING"] },
              expiresAt: { gt: now },
            },
            select: { userId: true },
            distinct: ["userId"],
          })
        : Promise.resolve([]),
      ownerIds.length
        ? prisma.ownerSubscription.findMany({
            where: { ownerId: { in: ownerIds } },
            orderBy: { paidAt: "desc" },
            select: { ownerId: true, validUntil: true },
          })
        : Promise.resolve([]),
    ]);

    const activeMemberSet = new Set(activeMemberships.map((m) => m.userId));
    const latestOwnerSub = new Map<string, Date>();
    for (const sub of ownerSubscriptions) {
      if (!latestOwnerSub.has(sub.ownerId)) {
        latestOwnerSub.set(sub.ownerId, sub.validUntil);
      }
    }

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
}

// GET /api/admin/users/:id — profile + gym membership history for View modal
export async function getUserDetail(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = String(req.params.id);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
        emailVerified: true,
        clerkGymId: true,
        clerkOfGym: {
          select: { id: true, name: true, owner: { select: { fullName: true } } },
        },
      },
    });

    if (!user) {
      sendError(res, "User not found", 404);
      return;
    }

    const now = new Date();
    await prisma.gymMembership.updateMany({
      where: {
        userId,
        status: { in: ["ACTIVE", "EXPIRING"] },
        expiresAt: { lt: now },
      },
      data: { status: "EXPIRED" },
    });

    const [memberships, approvals] = await Promise.all([
      prisma.gymMembership.findMany({
        where: { userId },
        include: {
          gym: { select: { id: true, name: true } },
          plan: { select: { name: true } },
        },
        orderBy: { joinedAt: "desc" },
      }),
      prisma.walkInApproval.findMany({
        where: { userId },
        include: { gym: { select: { id: true, name: true } } },
        orderBy: { submittedAt: "desc" },
      }),
    ]);

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
}

// DELETE /api/admin/users/:id
export async function removeUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const targetId = req.params.id as string;
    const existing = await prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true, role: true },
    });

    if (!existing) {
      sendError(res, "User not found", 404);
      return;
    }

    // Clerks are managed by their Gym Owner — Admin may view only
    if (existing.role === "CLERK") {
      sendError(res, "Clerk accounts can only be removed by their Gym Owner", 403);
      return;
    }

    const message = "Your account has been removed. Please sign in again.";

    const result = await permanentlyDeleteUser(targetId, { message });
    if (!result.ok) {
      sendError(res, result.message, result.status);
      return;
    }

    sendSuccess(res, null, "User removed");
  } catch (error) {
    console.error("Remove user error:", error);
    sendError(res, "Failed to remove user", 500);
  }
}

// GET /api/admin/gyms — active gyms + latest owner plan (accurate DB data)
export async function getAdminGyms(req: AuthRequest, res: Response): Promise<void> {
  try {
    await prisma.gym.updateMany({
      where: { status: "PENDING" },
      data: { status: "ACTIVE" },
    });

    // Ensure subscription rows exist and durations match purchased plan days
    try {
      await syncLatestOwnerSubscriptions();
      await healOwnerSubscriptionDurations();
    } catch (healError) {
      console.error("Admin gyms subscription sync failed:", healError);
    }

    const gyms = await prisma.gym.findMany({
      where: { status: "ACTIVE" },
      include: {
        owner: { select: { id: true, fullName: true, email: true } },
        _count: {
          select: {
            gymMemberships: {
              where: { status: { in: ["ACTIVE", "EXPIRING"] } },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const ownerIds = [...new Set(gyms.map((g) => g.ownerId))];

    // Latest purchase per owner (by paidAt) — source of truth for plan + days left
    const subscriptions = ownerIds.length
      ? await prisma.ownerSubscription.findMany({
          where: { ownerId: { in: ownerIds } },
          orderBy: { paidAt: "desc" },
        })
      : [];

    const latestByOwnerId = new Map<string, (typeof subscriptions)[number]>();
    for (const sub of subscriptions) {
      if (!latestByOwnerId.has(sub.ownerId)) {
        latestByOwnerId.set(sub.ownerId, sub);
      }
    }

    // Pending owner-plan Xendit payments (no OwnerSubscription yet)
    const pendingPayments = ownerIds.length
      ? await prisma.xenditPayment.findMany({
          where: {
            userId: { in: ownerIds },
            status: "PENDING",
            type: "SUBSCRIPTION",
          },
          select: { userId: true },
          distinct: ["userId"],
        })
      : [];
    const pendingOwnerSet = new Set(pendingPayments.map((p) => p.userId));

    const now = new Date();
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
        publishedStatus: "published" as const,
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
}

// GET /api/admin/analytics — Neon-backed platform analytics (no mocks)
export async function getAnalytics(req: AuthRequest, res: Response): Promise<void> {
  try {
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
      prisma.user.count(),
      prisma.user.count({ where: { role: "OWNER" } }),
      prisma.gym.count({ where: { status: "ACTIVE" } }),
      prisma.gymMembership.count({ where: { status: { in: ["ACTIVE", "EXPIRING"] } } }),
      prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.user.count({
        where: { createdAt: { gte: prevMonthStart, lt: startOfMonth } },
      }),
      prisma.gym.count({
        where: { status: "ACTIVE", createdAt: { gte: startOfMonth } },
      }),
      getOwnerRevenueStats(now),
      getOwnerRevenueChartSeries(now),
      prisma.gym.findMany({
        where: { status: "ACTIVE" },
        select: {
          id: true,
          name: true,
          address: true,
          coverImageUrl: true,
          _count: {
            select: {
              gymMemberships: {
                where: { status: { in: ["ACTIVE", "EXPIRING"] } },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.user.groupBy({
        by: ["role"],
        _count: { _all: true },
      }),
      prisma.gymMembership.findMany({
        where: {
          joinedAt: {
            gte: new Date(now.getFullYear(), now.getMonth() - 5, 1),
          },
        },
        select: { joinedAt: true },
      }),
      prisma.ownerSubscription.findMany({
        orderBy: { paidAt: "desc" },
        select: { ownerId: true, validUntil: true },
      }),
    ]);

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

    const usersByRole = Object.fromEntries(
      roleCounts.map((r) => [r.role, r._count._all]),
    ) as Record<string, number>;

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
}

// GET /api/admin/transactions
export async function getTransactions(req: AuthRequest, res: Response): Promise<void> {
  try {
    const now = new Date();
    const [result, revenueStats] = await Promise.all([
      buildAdminTransactionRows(now),
      getOwnerRevenueStats(now),
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
}


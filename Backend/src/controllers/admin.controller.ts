import { Response } from "express";
import prisma from "../config/database";
import { sendSuccess, sendError } from "../utils/apiResponse";
import { AuthRequest } from "../middleware/auth";

// GET /api/admin/dashboard
export async function getDashboard(req: AuthRequest, res: Response): Promise<void> {
  try {
    // Gyms auto-publish on Owner plan purchase — publish any legacy PENDING rows
    await prisma.gym.updateMany({
      where: { status: "PENDING" },
      data: { status: "ACTIVE" },
    });

    const [totalUsers, totalGyms, activities, subscriptions] = await Promise.all([
      prisma.user.count(),
      prisma.gym.count({ where: { status: "ACTIVE" } }),
      prisma.adminActivity.findMany({ orderBy: { createdAt: "desc" }, take: 12 }),
      prisma.ownerSubscription.aggregate({ _sum: { price: true } }),
    ]);

    // Revenue stats
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [todayRev, weekRev, monthRev] = await Promise.all([
      prisma.ownerSubscription.aggregate({ where: { paidAt: { gte: startOfDay } }, _sum: { price: true } }),
      prisma.ownerSubscription.aggregate({ where: { paidAt: { gte: startOfWeek } }, _sum: { price: true } }),
      prisma.ownerSubscription.aggregate({ where: { paidAt: { gte: startOfMonth } }, _sum: { price: true } }),
    ]);

    sendSuccess(res, {
      totalUsers,
      totalGyms,
      platformRevenue: subscriptions._sum.price || 0,
      revenueStats: {
        today: todayRev._sum.price || 0,
        thisWeek: weekRev._sum.price || 0,
        thisMonth: monthRev._sum.price || 0,
        total: subscriptions._sum.price || 0,
      },
      activity: activities,
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
      },
      orderBy: { createdAt: "desc" },
    });

    sendSuccess(res, users);
  } catch (error) {
    console.error("Get users error:", error);
    sendError(res, "Failed to fetch users", 500);
  }
}

// DELETE /api/admin/users/:id
export async function removeUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id as string } });

    if (!user) {
      sendError(res, "User not found", 404);
      return;
    }

    if (user.role === "ADMIN") {
      sendError(res, "Cannot remove admin users", 403);
      return;
    }

    await prisma.user.delete({ where: { id: req.params.id as string } });

    sendSuccess(res, null, "User removed");
  } catch (error) {
    console.error("Remove user error:", error);
    sendError(res, "Failed to remove user", 500);
  }
}

// GET /api/admin/transactions
export async function getTransactions(req: AuthRequest, res: Response): Promise<void> {
  try {
    const transactions = await prisma.ownerSubscription.findMany({
      include: {
        owner: { select: { id: true, fullName: true, email: true } },
        gym: { select: { name: true } },
      },
      orderBy: { paidAt: "desc" },
    });

    const result = transactions.map((txn) => ({
      id: txn.id,
      gymName: txn.gym?.name || "Pending setup",
      ownerId: txn.ownerId,
      ownerName: txn.owner.fullName,
      ownerEmail: txn.owner.email,
      planId: txn.planId,
      planName: txn.planName,
      type: "Owner Plan",
      amount: txn.price,
      method: txn.method,
      referenceNo: txn.referenceNo,
      createdAt: txn.paidAt.toISOString(),
    }));

    sendSuccess(res, result);
  } catch (error) {
    console.error("Get transactions error:", error);
    sendError(res, "Failed to fetch transactions", 500);
  }
}

// GET /api/admin/walk-in-approvals — view all walk-in membership requests
export async function getWalkInApprovals(req: AuthRequest, res: Response): Promise<void> {
  try {
    const approvals = await prisma.walkInApproval.findMany({
      include: {
        gym: { select: { name: true } },
        plan: { select: { name: true, price: true } },
      },
      orderBy: { submittedAt: "desc" },
      take: 200,
    });

    sendSuccess(
      res,
      approvals.map((a) => {
        const row = a as typeof a & { paymentStatus?: string; rejectionReason?: string };
        return {
          id: row.id,
          userId: row.userId,
          memberName: row.memberName,
          memberEmail: row.memberEmail,
          gymId: row.gymId,
          gymName: row.gym.name,
          planId: row.planId,
          planName: row.plan.name,
          planPrice: row.plan.price,
          paymentRef: row.paymentRef,
          totalPaid: row.totalPaid,
          paymentStatus: String(row.paymentStatus || "PAID").toLowerCase(),
          approvalStatus: row.status.toLowerCase(),
          status: row.status.toLowerCase(),
          rejectionReason: row.rejectionReason || "",
          submittedAt: row.submittedAt.getTime(),
          reviewedAt: row.reviewedAt?.getTime() ?? null,
          consumedAt: row.consumedAt?.getTime() ?? null,
        };
      }),
    );
  } catch (error) {
    console.error("Get admin walk-in approvals error:", error);
    sendError(res, "Failed to fetch walk-in approvals", 500);
  }
}

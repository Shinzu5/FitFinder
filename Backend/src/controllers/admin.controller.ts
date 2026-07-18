import { Response } from "express";
import prisma from "../config/database";
import { sendSuccess, sendError } from "../utils/apiResponse";
import { AuthRequest } from "../middleware/auth";

// GET /api/admin/dashboard
export async function getDashboard(req: AuthRequest, res: Response): Promise<void> {
  try {
    const [totalUsers, totalGyms, pendingGyms, activities, subscriptions] = await Promise.all([
      prisma.user.count(),
      prisma.gym.count({ where: { status: "ACTIVE" } }),
      prisma.gym.count({ where: { status: "PENDING" } }),
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
      pendingGyms,
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

// GET /api/admin/gym-applications
export async function getGymApplications(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { status } = req.query;

    const where: any = {};
    if (status && typeof status === "string") {
      where.status = status.toUpperCase();
    }

    const gyms = await prisma.gym.findMany({
      where,
      include: {
        owner: { select: { id: true, fullName: true, email: true } },
        ownerSubscriptions: { take: 1, orderBy: { paidAt: "desc" } },
      },
      orderBy: { createdAt: "desc" },
    });

    const applications = gyms.map((gym) => ({
      id: gym.id,
      gymName: gym.name,
      ownerName: gym.owner.fullName,
      ownerEmail: gym.owner.email,
      contactNumber: gym.contactNumber,
      location: gym.address,
      imageUrl: gym.coverImageUrl,
      websiteSlug: gym.website,
      planName: gym.ownerSubscriptions[0]?.planName || "N/A",
      planPrice: gym.ownerSubscriptions[0]?.price || 0,
      submittedAt: gym.createdAt.getTime(),
      status: gym.status.toLowerCase(),
    }));

    sendSuccess(res, applications);
  } catch (error) {
    console.error("Get gym applications error:", error);
    sendError(res, "Failed to fetch applications", 500);
  }
}

// PUT /api/admin/gym-applications/:id/approve
export async function approveGym(req: AuthRequest, res: Response): Promise<void> {
  try {
    const gym = await prisma.gym.findUnique({ where: { id: req.params.id as string } });

    if (!gym) {
      sendError(res, "Gym not found", 404);
      return;
    }

    if (gym.status !== "PENDING") {
      sendError(res, "Gym is not pending approval");
      return;
    }

    const updated = await prisma.gym.update({
      where: { id: req.params.id as string },
      data: { status: "ACTIVE" },
    });

    await prisma.adminActivity.create({
      data: {
        message: `${gym.name} approved`,
        tone: "SUCCESS",
      },
    });

    sendSuccess(res, updated, "Gym approved");
  } catch (error) {
    console.error("Approve gym error:", error);
    sendError(res, "Failed to approve gym", 500);
  }
}

// PUT /api/admin/gym-applications/:id/decline
export async function declineGym(req: AuthRequest, res: Response): Promise<void> {
  try {
    const gym = await prisma.gym.findUnique({ where: { id: req.params.id as string } });

    if (!gym) {
      sendError(res, "Gym not found", 404);
      return;
    }

    if (gym.status !== "PENDING") {
      sendError(res, "Gym is not pending approval");
      return;
    }

    const updated = await prisma.gym.update({
      where: { id: req.params.id as string },
      data: { status: "DECLINED" },
    });

    await prisma.adminActivity.create({
      data: {
        message: `${gym.name} declined`,
        tone: "WARNING",
      },
    });

    sendSuccess(res, updated, "Gym declined");
  } catch (error) {
    console.error("Decline gym error:", error);
    sendError(res, "Failed to decline gym", 500);
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

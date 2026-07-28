import { Response } from "express";
import prisma from "../config/database";
import { sendSuccess, sendError, sendCreated } from "../utils/apiResponse";
import { AuthRequest } from "../middleware/auth";

// Helper: get clerk's gym
async function getClerkGym(clerkId: string) {
  const user = await prisma.user.findUnique({
    where: { id: clerkId },
    select: { clerkGymId: true },
  });
  if (!user?.clerkGymId) return null;
  return prisma.gym.findUnique({ where: { id: user.clerkGymId } });
}

// GET /api/clerk/dashboard
export async function getDashboard(req: AuthRequest, res: Response): Promise<void> {
  try {
    const gym = await getClerkGym(req.userId!);
    if (!gym) { sendError(res, "Not assigned to any gym", 404); return; }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [todayTxns, members, totalMembers] = await Promise.all([
      prisma.clerkTransaction.findMany({
        where: { gymId: gym.id, createdAt: { gte: startOfDay } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.gymMembership.count({
        where: { gymId: gym.id, joinedAt: { gte: startOfDay } },
      }),
      prisma.gymMembership.count({ where: { gymId: gym.id } }),
    ]);

    const revenueToday = todayTxns.reduce((sum, txn) => sum + txn.amount, 0);

    sendSuccess(res, {
      gymName: gym.name,
      walkInsToday: todayTxns.length,
      revenueToday,
      newMembersToday: members,
      activeNow: totalMembers,
    });
  } catch (error) {
    console.error("Clerk dashboard error:", error);
    sendError(res, "Failed to fetch dashboard", 500);
  }
}

// GET /api/clerk/transactions
export async function getTransactions(req: AuthRequest, res: Response): Promise<void> {
  try {
    const gym = await getClerkGym(req.userId!);
    if (!gym) { sendError(res, "Not assigned to any gym", 404); return; }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const transactions = await prisma.clerkTransaction.findMany({
      where: { gymId: gym.id, createdAt: { gte: startOfDay } },
      orderBy: { createdAt: "desc" },
    });

    sendSuccess(res, transactions);
  } catch (error) {
    console.error("Get transactions error:", error);
    sendError(res, "Failed to fetch transactions", 500);
  }
}

// POST /api/clerk/transactions
export async function recordPayment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const gym = await getClerkGym(req.userId!);
    if (!gym) { sendError(res, "Not assigned to any gym", 404); return; }

    const txn = await prisma.clerkTransaction.create({
      data: {
        gymId: gym.id,
        clerkId: req.userId!,
        type: req.body.type,
        memberName: req.body.member || "Guest",
        amount: req.body.amount,
        method: req.body.method === "cash" ? "CASH" : "CASHLESS",
        notes: req.body.notes || "",
      },
    });

    sendCreated(res, txn, "Payment recorded");
  } catch (error) {
    console.error("Record payment error:", error);
    sendError(res, "Failed to record payment", 500);
  }
}

// GET /api/clerk/members
export async function getMembers(req: AuthRequest, res: Response): Promise<void> {
  try {
    const gym = await getClerkGym(req.userId!);
    if (!gym) { sendError(res, "Not assigned to any gym", 404); return; }

    const memberships = await prisma.gymMembership.findMany({
      where: { gymId: gym.id },
      include: {
        user: { select: { fullName: true, email: true } },
        plan: { select: { name: true, price: true } },
      },
      orderBy: { joinedAt: "desc" },
    });

    const members = memberships.map((m) => {
      const nameParts = m.user.fullName.split(" ");
      return {
        id: m.id,
        firstName: nameParts[0] || "",
        lastName: nameParts.slice(1).join(" ") || "",
        email: m.user.email,
        plan: m.plan.name,
        planPrice: m.plan.price,
        status: m.status.toLowerCase(),
        joinedAt: m.joinedAt.getTime(),
      };
    });

    sendSuccess(res, members);
  } catch (error) {
    console.error("Get clerk members error:", error);
    sendError(res, "Failed to fetch members", 500);
  }
}

// POST /api/clerk/members
export async function registerMember(req: AuthRequest, res: Response): Promise<void> {
  try {
    const gym = await getClerkGym(req.userId!);
    if (!gym) { sendError(res, "Not assigned to any gym", 404); return; }

    const { firstName, lastName, phone, email, planId } = req.body;

    const plan = await prisma.membershipPlan.findUnique({ where: { id: planId } });
    if (!plan) { sendError(res, "Plan not found", 404); return; }

    // Check if user exists or create placeholder
    let user = email
      ? await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
      : null;

    if (!user) {
      const { hashPassword } = require("../utils/hash");
      user = await prisma.user.create({
        data: {
          fullName: `${firstName} ${lastName}`.trim(),
          email: email?.toLowerCase() || `walkin-${Date.now()}@fitfinder.local`,
          passwordHash: await hashPassword("temppass123"),
          role: "USER",
          emailVerified: true,
        },
      });
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + plan.durationDays);

    const membership = await prisma.gymMembership.create({
      data: {
        userId: user.id,
        gymId: gym.id,
        planId: plan.id,
        paymentMethod: "CASH",
        paymentRef: `CLERK-${Date.now()}`,
        totalPaid: plan.price,
        status: "ACTIVE",
        expiresAt,
      },
    });

    // Record as transaction
    await prisma.clerkTransaction.create({
      data: {
        gymId: gym.id,
        clerkId: req.userId!,
        type: "MONTHLY",
        memberName: `${firstName} ${lastName}`.trim(),
        amount: plan.price,
        method: "CASH",
        notes: `New ${plan.name.toLowerCase()} registration`,
      },
    });

    sendCreated(res, membership, "Member registered");
  } catch (error) {
    console.error("Register member error:", error);
    sendError(res, "Failed to register member", 500);
  }
}

// GET /api/clerk/approvals
export async function getApprovals(req: AuthRequest, res: Response): Promise<void> {
  try {
    const gym = await getClerkGym(req.userId!);
    if (!gym) { sendError(res, "Not assigned to any gym", 404); return; }

    const approvals = await prisma.walkInApproval.findMany({
      where: { gymId: gym.id },
      orderBy: { submittedAt: "desc" },
    });

    sendSuccess(res, approvals);
  } catch (error) {
    console.error("Get approvals error:", error);
    sendError(res, "Failed to fetch approvals", 500);
  }
}

// PUT /api/clerk/approvals/:id/approve
export async function approveWalkIn(req: AuthRequest, res: Response): Promise<void> {
  try {
    const approval = await prisma.walkInApproval.findUnique({
      where: { id: req.params.id as string },
      include: { plan: true },
    });

    if (!approval) { sendError(res, "Not found", 404); return; }
    if (approval.status !== "PENDING") { sendError(res, "Already processed"); return; }

    // Create membership
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + approval.durationDays);

    await prisma.gymMembership.create({
      data: {
        userId: approval.userId,
        gymId: approval.gymId,
        planId: approval.planId,
        coachId: approval.coachId,
        paymentMethod: "CASH",
        paymentRef: approval.paymentRef,
        totalPaid: approval.totalPaid,
        status: "ACTIVE",
        expiresAt,
      },
    });

    const updated = await prisma.walkInApproval.update({
      where: { id: req.params.id as string },
      data: { status: "APPROVED", reviewedAt: new Date() },
    });

    sendSuccess(res, updated, "Walk-in approved");
  } catch (error) {
    console.error("Approve walk-in error:", error);
    sendError(res, "Failed to approve", 500);
  }
}

// PUT /api/clerk/approvals/:id/decline
export async function declineWalkIn(req: AuthRequest, res: Response): Promise<void> {
  try {
    const updated = await prisma.walkInApproval.update({
      where: { id: req.params.id as string },
      data: { status: "DECLINED", reviewedAt: new Date() },
    });

    sendSuccess(res, updated, "Walk-in declined");
  } catch (error) {
    console.error("Decline walk-in error:", error);
    sendError(res, "Failed to decline", 500);
  }
}

import { Response } from "express";
import prisma from "../config/database";
import { sendSuccess, sendError, sendCreated } from "../utils/apiResponse";
import { AuthRequest } from "../middleware/auth";
import {
  emitMembershipUpdated,
  emitWalkInApprovalsUpdated,
  emitWalkInStatus,
} from "../services/realtime.service";

// Helper: gym for Clerk (assigned) or Owner (owned) — same walk-in approval flow
async function getClerkGym(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, clerkGymId: true },
  });
  if (!user) return null;
  if (user.role === "OWNER") {
    return prisma.gym.findFirst({
      where: { ownerId: userId },
      orderBy: { createdAt: "desc" },
    });
  }
  if (!user.clerkGymId) return null;
  return prisma.gym.findUnique({ where: { id: user.clerkGymId } });
}

const FRONTEND_TO_TXN_TYPE: Record<string, "MONTHLY" | "SESSION" | "SUPPLEMENTS" | "DAY_PASS" | "RENEWAL" | "COACH"> = {
  monthly: "MONTHLY",
  session: "SESSION",
  supplements: "SUPPLEMENTS",
  "day-pass": "DAY_PASS",
  renewal: "RENEWAL",
  coach: "COACH",
  MONTHLY: "MONTHLY",
  SESSION: "SESSION",
  SUPPLEMENTS: "SUPPLEMENTS",
  DAY_PASS: "DAY_PASS",
  RENEWAL: "RENEWAL",
  COACH: "COACH",
};

function toFrontendTxnType(type: string): string {
  return type.toLowerCase().replace(/_/g, "-");
}

// GET /api/clerk/dashboard
export async function getDashboard(req: AuthRequest, res: Response): Promise<void> {
  try {
    const gym = await getClerkGym(req.userId!);
    if (!gym) { sendError(res, "Not assigned to any gym", 404); return; }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [openTxns, members, totalMembers] = await Promise.all([
      prisma.clerkTransaction.findMany({
        where: {
          gymId: gym.id,
          createdAt: { gte: startOfDay },
          dailySalesReportId: null,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.gymMembership.count({
        where: { gymId: gym.id, joinedAt: { gte: startOfDay } },
      }),
      prisma.gymMembership.count({ where: { gymId: gym.id } }),
    ]);

    const revenueToday = openTxns.reduce((sum, txn) => sum + txn.amount, 0);

    sendSuccess(res, {
      gymName: gym.name,
      walkInsToday: openTxns.length,
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

    // Running counter: only open (not yet included in a daily closing) transactions
    const transactions = await prisma.clerkTransaction.findMany({
      where: {
        gymId: gym.id,
        createdAt: { gte: startOfDay },
        dailySalesReportId: null,
      },
      orderBy: { createdAt: "desc" },
    });

    sendSuccess(
      res,
      transactions.map((txn) => ({
        id: txn.id,
        type: toFrontendTxnType(txn.type),
        member: txn.memberName,
        amount: txn.amount,
        method: txn.method.toLowerCase() === "cash" ? "cash" : "cashless",
        notes: txn.notes,
        createdAt: txn.createdAt.getTime(),
      })),
    );
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

    const mappedType = FRONTEND_TO_TXN_TYPE[String(req.body.type || "")];
    if (!mappedType) {
      sendError(res, "Invalid transaction type");
      return;
    }

    const amount = Number(req.body.amount);
    if (!amount || amount <= 0) {
      sendError(res, "Amount must be greater than 0");
      return;
    }

    const txn = await prisma.clerkTransaction.create({
      data: {
        gymId: gym.id,
        clerkId: req.userId!,
        type: mappedType,
        memberName: req.body.member || "Guest",
        amount,
        method: req.body.method === "cash" ? "CASH" : "CASHLESS",
        notes: req.body.notes || "",
      },
    });

    sendCreated(res, {
      id: txn.id,
      type: toFrontendTxnType(txn.type),
      member: txn.memberName,
      amount: txn.amount,
      method: txn.method.toLowerCase() === "cash" ? "cash" : "cashless",
      notes: txn.notes,
      createdAt: txn.createdAt.getTime(),
    }, "Payment recorded");
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
      const remainingMs = m.expiresAt.getTime() - Date.now();
      const remainingDays = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));

      return {
        id: m.id,
        firstName: nameParts[0] || "",
        lastName: nameParts.slice(1).join(" ") || "",
        email: m.user.email,
        plan: m.plan.name,
        planPrice: m.plan.price,
        status: m.status.toLowerCase(),
        joinedAt: m.joinedAt.getTime(),
        expiresAt: m.expiresAt.getTime(),
        remainingDays,
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

// GET /api/clerk/plans
export async function getPlans(req: AuthRequest, res: Response): Promise<void> {
  try {
    const gym = await getClerkGym(req.userId!);
    if (!gym) { sendError(res, "Not assigned to any gym", 404); return; }

    const plans = await prisma.membershipPlan.findMany({
      where: { gymId: gym.id },
      orderBy: { price: "asc" },
    });

    sendSuccess(
      res,
      plans.map((plan) => ({
        id: plan.id,
        label: plan.name,
        price: plan.price,
        durationDays: plan.durationDays,
      })),
    );
  } catch (error) {
    console.error("Get clerk plans error:", error);
    sendError(res, "Failed to fetch plans", 500);
  }
}

// GET /api/clerk/approvals
export async function getApprovals(req: AuthRequest, res: Response): Promise<void> {
  try {
    const gym = await getClerkGym(req.userId!);
    if (!gym) { sendError(res, "Not assigned to any gym", 404); return; }

    const approvals = await prisma.walkInApproval.findMany({
      where: { gymId: gym.id },
      include: {
        plan: { select: { name: true, price: true } },
      },
      orderBy: { submittedAt: "desc" },
    });

    sendSuccess(
      res,
      approvals.map((a) => ({
        id: a.id,
        userId: a.userId,
        memberName: a.memberName,
        memberEmail: a.memberEmail,
        gymId: a.gymId,
        gymName: gym.name,
        planId: a.planId,
        planName: a.plan.name,
        planPrice: a.plan.price,
        coachId: a.coachId,
        coachName: a.coachName,
        coachSessionPrice: a.coachSessionPrice,
        paymentRef: a.paymentRef,
        totalPaid: a.totalPaid,
        durationDays: a.durationDays,
        paymentStatus: String((a as any).paymentStatus || "PAID").toLowerCase(),
        approvalStatus: a.status.toLowerCase(),
        status: a.status.toLowerCase(),
        rejectionReason: (a as any).rejectionReason || "",
        submittedAt: a.submittedAt.getTime(),
        reviewedAt: a.reviewedAt?.getTime() ?? null,
        consumedAt: a.consumedAt?.getTime() ?? null,
      })),
    );
  } catch (error) {
    console.error("Get approvals error:", error);
    sendError(res, "Failed to fetch approvals", 500);
  }
}

// PUT /api/clerk/approvals/:id/approve
// Owner/Clerk Approve → activate membership (gymer then sees Done).
export async function approveWalkIn(req: AuthRequest, res: Response): Promise<void> {
  try {
    const approval = await prisma.walkInApproval.findUnique({
      where: { id: req.params.id as string },
      include: { plan: true, gym: { select: { name: true } } },
    });

    if (!approval) { sendError(res, "Not found", 404); return; }
    if (approval.status !== "PENDING") { sendError(res, "Already processed"); return; }

    const gym = await getClerkGym(req.userId!);
    if (!gym || gym.id !== approval.gymId) {
      sendError(res, "Not authorized for this gym", 403);
      return;
    }

    const now = new Date();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + approval.durationDays);

    const updated = await prisma.$transaction(async (tx) => {
      const existingMembership = await tx.gymMembership.findFirst({
        where: {
          userId: approval.userId,
          gymId: approval.gymId,
          status: { in: ["ACTIVE", "EXPIRING"] },
        },
      });

      if (!existingMembership) {
        await tx.gymMembership.create({
          data: {
            userId: approval.userId,
            gymId: approval.gymId,
            planId: approval.planId,
            coachId: approval.coachId,
            paymentMethod: "WALK_IN",
            paymentRef: approval.paymentRef,
            totalPaid: approval.totalPaid,
            status: "ACTIVE",
            expiresAt,
          },
        });
      }

      await tx.clerkTransaction.create({
        data: {
          gymId: approval.gymId,
          clerkId: req.userId!,
          type: "MONTHLY",
          memberName: approval.memberName,
          amount: approval.totalPaid,
          method: "CASH",
          notes: `Walk-in approved · Ref ${approval.paymentRef}`,
        },
      });

      // Keep consumedAt null until gymer clicks Done (onboarding complete)
      return tx.walkInApproval.update({
        where: { id: approval.id },
        data: {
          status: "APPROVED",
          reviewedAt: now,
          paymentStatus: "PAID",
        },
        include: {
          plan: { select: { name: true, price: true } },
          gym: { select: { name: true } },
        },
      });
    });

    const responsePayload = {
      id: updated.id,
      userId: updated.userId,
      memberName: updated.memberName,
      memberEmail: updated.memberEmail,
      gymId: updated.gymId,
      gymName: updated.gym.name,
      planId: updated.planId,
      planName: updated.plan.name,
      planPrice: updated.plan.price,
      coachId: updated.coachId,
      coachName: updated.coachName,
      coachSessionPrice: updated.coachSessionPrice,
      paymentRef: updated.paymentRef,
      totalPaid: updated.totalPaid,
      durationDays: updated.durationDays,
      paymentStatus: String((updated as any).paymentStatus || "PAID").toLowerCase(),
      approvalStatus: "approved",
      status: "approved",
      rejectionReason: (updated as any).rejectionReason || "",
      submittedAt: updated.submittedAt.getTime(),
      reviewedAt: updated.reviewedAt?.getTime() ?? null,
      consumedAt: updated.consumedAt?.getTime() ?? null,
    };

    emitWalkInStatus(updated.userId, responsePayload);
    emitMembershipUpdated(updated.userId);
    void emitWalkInApprovalsUpdated(updated.gymId);

    sendSuccess(
      res,
      responsePayload,
      "Walk-in approved — membership is now Active",
    );
  } catch (error) {
    console.error("Approve walk-in error:", error);
    sendError(res, "Failed to approve", 500);
  }
}

// GET /api/clerk/walk-in-payments
// Approved requests waiting for front-desk cash confirmation (Done).
export async function getWalkInPayments(req: AuthRequest, res: Response): Promise<void> {
  try {
    const gym = await getClerkGym(req.userId!);
    if (!gym) { sendError(res, "Not assigned to any gym", 404); return; }

    const approvals = await prisma.walkInApproval.findMany({
      where: {
        gymId: gym.id,
        status: "APPROVED",
        consumedAt: null,
      },
      include: {
        plan: { select: { name: true, price: true } },
      },
      orderBy: { reviewedAt: "asc" },
    });

    sendSuccess(
      res,
      approvals.map((a) => ({
        id: a.id,
        userId: a.userId,
        memberName: a.memberName,
        memberEmail: a.memberEmail,
        gymId: a.gymId,
        gymName: gym.name,
        planId: a.planId,
        planName: a.plan.name,
        planPrice: a.plan.price,
        coachId: a.coachId,
        coachName: a.coachName,
        coachSessionPrice: a.coachSessionPrice,
        paymentRef: a.paymentRef,
        totalPaid: a.totalPaid,
        durationDays: a.durationDays,
        status: a.status.toLowerCase(),
        submittedAt: a.submittedAt.getTime(),
        reviewedAt: a.reviewedAt?.getTime(),
        consumedAt: a.consumedAt?.getTime() ?? null,
        paymentMethod: "Walk-in",
      })),
    );
  } catch (error) {
    console.error("Get walk-in payments error:", error);
    sendError(res, "Failed to fetch walk-in payments", 500);
  }
}

// POST /api/clerk/walk-in-payments/:id/complete
// Clerk confirms cash received → activate membership + record sales txn.
export async function completeWalkInPayment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const approval = await prisma.walkInApproval.findUnique({
      where: { id: req.params.id as string },
      include: { plan: true },
    });

    if (!approval) { sendError(res, "Not found", 404); return; }

    const gym = await getClerkGym(req.userId!);
    if (!gym || gym.id !== approval.gymId) {
      sendError(res, "Not authorized for this gym", 403);
      return;
    }

    if (approval.status !== "APPROVED") {
      sendError(res, "Request must be approved before payment can be completed");
      return;
    }

    if (approval.consumedAt) {
      sendError(res, "Payment already confirmed for this request");
      return;
    }

    const existingMembership = await prisma.gymMembership.findFirst({
      where: {
        userId: approval.userId,
        gymId: approval.gymId,
        status: { in: ["ACTIVE", "EXPIRING"] },
      },
    });

    if (existingMembership) {
      await prisma.walkInApproval.update({
        where: { id: approval.id },
        data: { consumedAt: new Date() },
      });
      // Still success — gymer already active; unlocks via membership poll
      sendSuccess(
        res,
        {
          membership: existingMembership,
          alreadyActive: true,
          approval: {
            id: approval.id,
            status: "approved",
            consumedAt: Date.now(),
            paymentRef: approval.paymentRef,
          },
        },
        "Membership already active",
      );
      return;
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + approval.durationDays);

    const [membership, transaction, updated] = await prisma.$transaction([
      prisma.gymMembership.create({
        data: {
          userId: approval.userId,
          gymId: approval.gymId,
          planId: approval.planId,
          coachId: approval.coachId,
          paymentMethod: "WALK_IN",
          paymentRef: approval.paymentRef,
          totalPaid: approval.totalPaid,
          status: "ACTIVE",
          expiresAt,
        },
      }),
      prisma.clerkTransaction.create({
        data: {
          gymId: approval.gymId,
          clerkId: req.userId!,
          type: "MONTHLY",
          memberName: approval.memberName,
          amount: approval.totalPaid,
          method: "CASH",
          notes: `Walk-in membership · Ref ${approval.paymentRef}`,
        },
      }),
      prisma.walkInApproval.update({
        where: { id: approval.id },
        data: { consumedAt: new Date() },
      }),
    ]);

    sendSuccess(
      res,
      {
        membership,
        transaction,
        approval: {
          id: updated.id,
          status: updated.status.toLowerCase(),
          consumedAt: updated.consumedAt?.getTime(),
          paymentRef: updated.paymentRef,
          totalPaid: updated.totalPaid,
          memberName: updated.memberName,
          planName: approval.plan.name,
          gymName: gym.name,
        },
      },
      "Payment confirmed. Membership activated.",
    );
  } catch (error) {
    console.error("Complete walk-in payment error:", error);
    sendError(res, "Failed to complete walk-in payment", 500);
  }
}

// PUT /api/clerk/approvals/:id/decline
export async function declineWalkIn(req: AuthRequest, res: Response): Promise<void> {
  try {
    const approval = await prisma.walkInApproval.findUnique({
      where: { id: req.params.id as string },
      include: {
        plan: { select: { name: true, price: true } },
        gym: { select: { name: true } },
      },
    });

    if (!approval) { sendError(res, "Not found", 404); return; }
    if (approval.status !== "PENDING") { sendError(res, "Already processed"); return; }

    const gym = await getClerkGym(req.userId!);
    if (!gym || gym.id !== approval.gymId) {
      sendError(res, "Not authorized for this gym", 403);
      return;
    }

    const reason = String(req.body?.reason || req.body?.rejectionReason || "").trim();

    const updated = await prisma.walkInApproval.update({
      where: { id: req.params.id as string },
      data: {
        status: "DECLINED",
        reviewedAt: new Date(),
        rejectionReason: reason || "Request declined by gym staff",
      },
      include: {
        plan: { select: { name: true, price: true } },
        gym: { select: { name: true } },
      },
    });

    const responsePayload = {
      id: updated.id,
      userId: updated.userId,
      memberName: updated.memberName,
      memberEmail: updated.memberEmail,
      gymId: updated.gymId,
      gymName: updated.gym.name,
      planId: updated.planId,
      planName: updated.plan.name,
      planPrice: updated.plan.price,
      coachId: updated.coachId,
      coachName: updated.coachName,
      coachSessionPrice: updated.coachSessionPrice,
      paymentRef: updated.paymentRef,
      totalPaid: updated.totalPaid,
      durationDays: updated.durationDays,
      paymentStatus: String((updated as any).paymentStatus || "PAID").toLowerCase(),
      approvalStatus: "declined",
      status: "declined",
      rejectionReason: (updated as any).rejectionReason || "",
      submittedAt: updated.submittedAt.getTime(),
      reviewedAt: updated.reviewedAt?.getTime() ?? null,
      consumedAt: updated.consumedAt?.getTime() ?? null,
    };

    emitWalkInStatus(updated.userId, responsePayload);
    void emitWalkInApprovalsUpdated(updated.gymId);

    sendSuccess(res, responsePayload, "Walk-in declined");
  } catch (error) {
    console.error("Decline walk-in error:", error);
    sendError(res, "Failed to decline", 500);
  }
}

function startOfLocalDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function reportDateOnly(date = new Date()) {
  const d = startOfLocalDay(date);
  // Prisma @db.Date expects a Date at UTC midnight for the calendar day
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

// GET /api/clerk/sales/closing-preview
export async function getClosingPreview(req: AuthRequest, res: Response): Promise<void> {
  try {
    const gym = await getClerkGym(req.userId!);
    if (!gym) { sendError(res, "Not assigned to any gym", 404); return; }

    const startOfDay = startOfLocalDay();
    const openTxns = await prisma.clerkTransaction.findMany({
      where: {
        gymId: gym.id,
        createdAt: { gte: startOfDay },
        dailySalesReportId: null,
      },
      orderBy: { createdAt: "asc" },
    });

    const totalRevenue = openTxns.reduce((sum, txn) => sum + txn.amount, 0);

    sendSuccess(res, {
      gymId: gym.id,
      gymName: gym.name,
      date: startOfDay.toISOString(),
      totalTransactions: openTxns.length,
      totalRevenue,
      canClose: openTxns.length > 0,
      message:
        openTxns.length === 0
          ? "No open transactions to close. Record new payments before closing again."
          : "Ready to close today's open sales.",
    });
  } catch (error) {
    console.error("Closing preview error:", error);
    sendError(res, "Failed to load closing preview", 500);
  }
}

// POST /api/clerk/sales/close
export async function closeDailySales(req: AuthRequest, res: Response): Promise<void> {
  try {
    const gym = await getClerkGym(req.userId!);
    if (!gym) { sendError(res, "Not assigned to any gym", 404); return; }

    const startOfDay = startOfLocalDay();
    const openTxns = await prisma.clerkTransaction.findMany({
      where: {
        gymId: gym.id,
        createdAt: { gte: startOfDay },
        dailySalesReportId: null,
      },
      orderBy: { createdAt: "asc" },
    });

    if (openTxns.length === 0) {
      sendError(
        res,
        "Cannot close sales: no new transactions since the last closing.",
        400,
      );
      return;
    }

    const totalRevenue = openTxns.reduce((sum, txn) => sum + txn.amount, 0);
    const txnIds = openTxns.map((txn) => txn.id);

    const report = await prisma.$transaction(async (tx) => {
      const created = await tx.dailySalesReport.create({
        data: {
          gymId: gym.id,
          clerkId: req.userId!,
          reportDate: reportDateOnly(),
          totalTransactions: openTxns.length,
          totalRevenue,
        },
      });

      await tx.clerkTransaction.updateMany({
        where: { id: { in: txnIds } },
        data: { dailySalesReportId: created.id },
      });

      return created;
    });

    sendCreated(
      res,
      {
        id: report.id,
        gymId: report.gymId,
        clerkId: report.clerkId,
        date: report.reportDate,
        totalTransactions: report.totalTransactions,
        totalRevenue: report.totalRevenue,
        closedAt: report.closedAt,
      },
      "Daily sales closed successfully",
    );
  } catch (error) {
    console.error("Close daily sales error:", error);
    sendError(res, "Failed to close daily sales", 500);
  }
}

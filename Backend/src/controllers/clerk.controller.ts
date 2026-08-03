import { Response } from "express";
import prisma from "../config/database";
import { sendSuccess, sendError, sendCreated } from "../utils/apiResponse";
import { AuthRequest } from "../middleware/auth";
import {
  emitAdminGymsUpdated,
  emitSalesUpdated,
  emitWalkInApprovalsUpdated,
  emitWalkInStatus,
} from "../services/realtime.service";
import {
  computeExtendedExpiresAt,
  listGymMembers,
  notifyMembershipChange,
  upsertGymMembership,
  type RegisteredBy,
} from "../services/gymMembership.service";
import {
  notifyMembershipApproved,
  notifyMembershipRejected,
} from "../services/membershipNotification.service";

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

function shapeClerkTransaction(txn: {
  id: string;
  type: string;
  memberName: string;
  amount: number;
  method: string;
  notes: string;
  createdAt: Date;
}) {
  return {
    id: txn.id,
    type: toFrontendTxnType(txn.type),
    member: txn.memberName,
    amount: txn.amount,
    method: txn.method.toLowerCase() === "cash" ? "cash" : "cashless",
    notes: txn.notes || "",
    createdAt: txn.createdAt.getTime(),
  };
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// GET /api/clerk/dashboard
export async function getDashboard(req: AuthRequest, res: Response): Promise<void> {
  try {
    const gym = await getClerkGym(req.userId!);
    if (!gym) { sendError(res, "Not assigned to any gym", 404); return; }

    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    // Last 5 calendar months including current (matches existing chart slots)
    const chartStart = new Date(now.getFullYear(), now.getMonth() - 4, 1);

    const [todayTxns, monthSum, chartTxns, newMembersToday, activeNow] = await Promise.all([
      prisma.clerkTransaction.findMany({
        where: { gymId: gym.id, createdAt: { gte: startOfDay } },
        select: { amount: true },
      }),
      prisma.clerkTransaction.aggregate({
        where: { gymId: gym.id, createdAt: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      prisma.clerkTransaction.findMany({
        where: { gymId: gym.id, createdAt: { gte: chartStart } },
        select: { amount: true, createdAt: true },
      }),
      prisma.gymMembership.count({
        where: { gymId: gym.id, joinedAt: { gte: startOfDay } },
      }),
      prisma.gymMembership.count({
        where: {
          gymId: gym.id,
          status: { in: ["ACTIVE", "EXPIRING"] },
          expiresAt: { gt: now },
        },
      }),
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

    sendSuccess(res, {
      gymName: gym.name,
      walkInsToday: todayTxns.length,
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

    sendSuccess(res, transactions.map(shapeClerkTransaction));
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
        // Free-text Notes drive Today's Log title on the client
        notes: String(req.body.notes || "").trim(),
      },
    });

    void emitSalesUpdated(gym.id);

    sendCreated(res, shapeClerkTransaction(txn), "Payment recorded");
  } catch (error) {
    console.error("Record payment error:", error);
    sendError(res, "Failed to record payment", 500);
  }
}

// PUT /api/clerk/transactions/:id — edit an open (not-yet-closed) Today's Log payment
export async function updatePayment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const gym = await getClerkGym(req.userId!);
    if (!gym) { sendError(res, "Not assigned to any gym", 404); return; }

    const existing = await prisma.clerkTransaction.findFirst({
      where: {
        id: String(req.params.id),
        gymId: gym.id,
        dailySalesReportId: null,
      },
    });
    if (!existing) {
      sendError(res, "Open payment not found", 404);
      return;
    }

    const data: {
      memberName?: string;
      amount?: number;
      method?: "CASH" | "CASHLESS";
      notes?: string;
      type?: "MONTHLY" | "SESSION" | "SUPPLEMENTS" | "DAY_PASS" | "RENEWAL" | "COACH";
    } = {};

    if (req.body.member !== undefined) {
      data.memberName = String(req.body.member || "Guest").trim() || "Guest";
    }
    if (req.body.notes !== undefined) {
      data.notes = String(req.body.notes || "").trim();
    }
    if (req.body.amount !== undefined) {
      const amount = Number(req.body.amount);
      if (!amount || amount <= 0) {
        sendError(res, "Amount must be greater than 0");
        return;
      }
      data.amount = amount;
    }
    if (req.body.method !== undefined) {
      data.method = req.body.method === "cash" ? "CASH" : "CASHLESS";
    }
    if (req.body.type !== undefined) {
      const mappedType = FRONTEND_TO_TXN_TYPE[String(req.body.type || "")];
      if (!mappedType) {
        sendError(res, "Invalid transaction type");
        return;
      }
      data.type = mappedType;
    }

    const txn = await prisma.clerkTransaction.update({
      where: { id: existing.id },
      data,
    });

    void emitSalesUpdated(gym.id);
    sendSuccess(res, shapeClerkTransaction(txn), "Payment updated");
  } catch (error) {
    console.error("Update payment error:", error);
    sendError(res, "Failed to update payment", 500);
  }
}

// DELETE /api/clerk/transactions/:id — remove an open Today's Log payment
export async function deletePayment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const gym = await getClerkGym(req.userId!);
    if (!gym) { sendError(res, "Not assigned to any gym", 404); return; }

    const existing = await prisma.clerkTransaction.findFirst({
      where: {
        id: String(req.params.id),
        gymId: gym.id,
        dailySalesReportId: null,
      },
      select: { id: true },
    });
    if (!existing) {
      sendError(res, "Open payment not found", 404);
      return;
    }

    await prisma.clerkTransaction.delete({ where: { id: existing.id } });
    void emitSalesUpdated(gym.id);
    sendSuccess(res, { id: existing.id }, "Payment removed");
  } catch (error) {
    console.error("Delete payment error:", error);
    sendError(res, "Failed to remove payment", 500);
  }
}

// GET /api/clerk/members
export async function getMembers(req: AuthRequest, res: Response): Promise<void> {
  try {
    const gym = await getClerkGym(req.userId!);
    if (!gym) { sendError(res, "Not assigned to any gym", 404); return; }

    const members = await listGymMembers(gym.id);
    // Clerk table uses epoch ms for dates
    sendSuccess(
      res,
      members.map((m) => ({
        ...m,
        joinedAt: m.joinedAtMs,
        expiresAt: m.expiresAtMs,
        startsAt: m.startsAtMs,
      })),
    );
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

    const plan = await prisma.membershipPlan.findFirst({
      where: { id: planId, gymId: gym.id, isActive: true },
    });
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

    const actor = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { role: true },
    });
    const registeredBy: RegisteredBy =
      actor?.role === "OWNER" ? "OWNER" : "CLERK";

    const membership = await prisma.$transaction(async (tx) => {
      const row = await upsertGymMembership(
        {
          userId: user.id,
          gymId: gym.id,
          planId: plan.id,
          planName: plan.name,
          planPrice: plan.price,
          durationDays: plan.durationDays,
          paymentMethod: "CASH",
          paymentRef: `CLERK-${Date.now()}`,
          totalPaid: plan.price,
          memberType: "WALK_IN",
          registeredBy,
          registeredById: req.userId!,
          expiresAt,
        },
        tx,
      );

      await tx.clerkTransaction.create({
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

      return row;
    });

    await notifyMembershipChange(user.id, gym.id);
    void emitSalesUpdated(gym.id);
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
      where: { gymId: gym.id, isActive: true },
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
      approvals.map((a) => {
        const method = String((a as any).paymentMethod || "WALK_IN").toUpperCase();
        return {
          id: a.id,
          userId: a.userId,
          memberName: a.memberName,
          memberEmail: a.memberEmail,
          gymId: a.gymId,
          gymName: gym.name,
          planId: a.planId,
          planName: a.planName || a.plan?.name || "",
          planPrice: a.planPrice > 0 ? a.planPrice : a.plan?.price ?? 0,
          coachId: a.coachId,
          coachName: a.coachName,
          coachSessionPrice: a.coachSessionPrice,
          paymentRef: a.paymentRef,
          totalPaid: a.totalPaid,
          durationDays: a.durationDays,
          isRenewal: Boolean((a as any).isRenewal),
          paymentMethod: method === "XENDIT" ? "Cashless" : "Walk-in",
          paymentMethodRaw: method,
          paymentStatus: String((a as any).paymentStatus || "PAID").toLowerCase(),
          approvalStatus: a.status.toLowerCase(),
          status: a.status.toLowerCase(),
          rejectionReason: (a as any).rejectionReason || "",
          submittedAt: a.submittedAt.getTime(),
          reviewedAt: a.reviewedAt?.getTime() ?? null,
          consumedAt: a.consumedAt?.getTime() ?? null,
          renewalDate: a.submittedAt.getTime(),
        };
      }),
    );
  } catch (error) {
    console.error("Get approvals error:", error);
    sendError(res, "Failed to fetch approvals", 500);
  }
}

/**
 * Activate ACTIVE GymMembership + sales from an approved request.
 * Used for renewals on Approve, and for new joins on Done / clerk complete.
 */
async function activateMembershipFromApproval(opts: {
  approval: {
    id: string;
    userId: string;
    gymId: string;
    planId: string | null;
    planName: string;
    planPrice: number;
    plan?: { name: string; price: number } | null;
    coachId: string | null;
    memberName: string;
    paymentRef: string;
    totalPaid: number;
    durationDays: number;
    isRenewal?: boolean;
    paymentMethod?: string | null;
  };
  actorId: string;
  registeredBy: RegisteredBy;
  isRenewal: boolean;
  consumeNow: boolean;
}) {
  const { approval, actorId, registeredBy, isRenewal, consumeNow } = opts;
  const now = new Date();
  const payMethodRaw = String(approval.paymentMethod || "WALK_IN").toUpperCase();
  const memberType = payMethodRaw === "XENDIT" ? "ONLINE" : "WALK_IN";
  const txnMethod = payMethodRaw === "XENDIT" ? "XENDIT" : "CASH";

  const existingMembership = await prisma.gymMembership.findFirst({
    where: { userId: approval.userId, gymId: approval.gymId },
    orderBy: { joinedAt: "desc" },
    select: { expiresAt: true, startsAt: true },
  });

  const expiresAt = isRenewal
    ? computeExtendedExpiresAt(existingMembership?.expiresAt, approval.durationDays, now)
    : (() => {
        const d = new Date(now);
        d.setDate(d.getDate() + approval.durationDays);
        return d;
      })();

  return prisma.$transaction(async (tx) => {
    const dupTxn = await tx.clerkTransaction.findFirst({
      where: {
        gymId: approval.gymId,
        notes: { contains: approval.paymentRef },
      },
      select: { id: true },
    });
    if (dupTxn) {
      throw new Error("DUPLICATE_PAYMENT_REF");
    }

    let liveCoachId: string | null = approval.coachId;
    if (approval.coachId) {
      const liveCoach = await tx.coach.findFirst({
        where: {
          id: approval.coachId,
          gymId: approval.gymId,
          isActive: true,
        },
        select: { id: true },
      });
      if (!liveCoach) liveCoachId = null;
    }

    await upsertGymMembership(
      {
        userId: approval.userId,
        gymId: approval.gymId,
        planId: approval.planId,
        planName: approval.planName || approval.plan?.name || "",
        planPrice: approval.planPrice || approval.plan?.price || 0,
        durationDays: approval.durationDays,
        coachId: liveCoachId,
        paymentMethod: payMethodRaw === "XENDIT" ? "XENDIT" : "WALK_IN",
        paymentRef: approval.paymentRef,
        totalPaid: approval.totalPaid,
        accumulateTotalPaid: isRenewal,
        memberType,
        registeredBy,
        registeredById: actorId,
        expiresAt,
        startsAt:
          isRenewal && existingMembership?.startsAt
            ? existingMembership.startsAt
            : now,
        status: "ACTIVE",
      },
      tx,
    );

    await tx.clerkTransaction.create({
      data: {
        gymId: approval.gymId,
        clerkId: actorId,
        type: isRenewal ? "RENEWAL" : "MONTHLY",
        memberName: approval.memberName,
        amount: approval.totalPaid,
        method: txnMethod as "CASH" | "XENDIT",
        notes: isRenewal
          ? `Membership renewal approved · Ref ${approval.paymentRef}`
          : `Membership activated · Ref ${approval.paymentRef}`,
      },
    });

    return tx.walkInApproval.update({
      where: { id: approval.id },
      data: {
        status: "APPROVED",
        reviewedAt: now,
        paymentStatus: "PAID",
        isRenewal,
        consumedAt: consumeNow ? now : null,
      },
      include: {
        plan: { select: { name: true, price: true } },
        gym: { select: { name: true } },
      },
    });
  });
}

// PUT /api/clerk/approvals/:id/approve
// Renewals / paid GCash: activate immediately.
// Walk-in new joins: approve only — ACTIVE membership waits for Done / clerk complete.
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
    const actor = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { role: true },
    });
    const registeredBy: RegisteredBy =
      actor?.role === "OWNER" ? "OWNER" : "CLERK";

    const liveActive = await prisma.gymMembership.findFirst({
      where: {
        userId: approval.userId,
        gymId: approval.gymId,
        status: { in: ["ACTIVE", "EXPIRING"] },
        expiresAt: { gt: now },
      },
      select: { id: true },
    });

    const isRenewal = Boolean((approval as any).isRenewal) || Boolean(liveActive);
    const payMethodRaw = String((approval as any).paymentMethod || "WALK_IN").toUpperCase();

    // Owner/Clerk Approve activates ACTIVE membership — gymer unlocks only after this step
    let updated;
    try {
      updated = await activateMembershipFromApproval({
        approval,
        actorId: req.userId!,
        registeredBy,
        isRenewal,
        consumeNow: true,
      });
    } catch (err: any) {
      if (err?.message === "DUPLICATE_PAYMENT_REF") {
        sendError(res, "This payment was already applied", 409);
        return;
      }
      throw err;
    }

    const methodLabel = payMethodRaw === "XENDIT" ? "Cashless" : "Walk-in";
    const responsePayload = {
      id: updated.id,
      userId: updated.userId,
      memberName: updated.memberName,
      memberEmail: updated.memberEmail,
      gymId: updated.gymId,
      gymName: updated.gym?.name || approval.gym?.name || gym.name,
      planId: updated.planId,
      planName: updated.planName || updated.plan?.name || approval.planName || "",
      planPrice:
        updated.planPrice > 0
          ? updated.planPrice
          : updated.plan?.price ?? approval.planPrice ?? 0,
      coachId: updated.coachId,
      coachName: updated.coachName,
      coachSessionPrice: updated.coachSessionPrice,
      paymentRef: updated.paymentRef,
      totalPaid: updated.totalPaid,
      durationDays: updated.durationDays,
      isRenewal,
      paymentMethod: methodLabel,
      paymentStatus: String(updated.paymentStatus || "PAID").toLowerCase(),
      approvalStatus: "approved",
      status: "approved",
      rejectionReason: updated.rejectionReason || "",
      submittedAt: updated.submittedAt.getTime(),
      reviewedAt: updated.reviewedAt?.getTime() ?? null,
      consumedAt: updated.consumedAt?.getTime() ?? null,
      renewalDate: updated.submittedAt.getTime(),
    };

    emitWalkInStatus(updated.userId, responsePayload);
    void emitWalkInApprovalsUpdated(updated.gymId);
    await notifyMembershipChange(updated.userId, updated.gymId);
    void emitSalesUpdated(updated.gymId);
    void emitAdminGymsUpdated();
    void notifyMembershipApproved({
      userId: updated.userId,
      gymId: updated.gymId,
      gymName: responsePayload.gymName,
      approvalId: updated.id,
      isRenewal,
    });

    sendSuccess(
      res,
      responsePayload,
      isRenewal
        ? "Renewal approved — membership days extended"
        : "Membership approved — gymer dashboard unlocked",
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
        planName: a.planName || a.plan?.name || "",
        planPrice: a.planPrice > 0 ? a.planPrice : a.plan?.price ?? 0,
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
// Confirms walk-in cash and activates ACTIVE membership for new joins.
export async function completeWalkInPayment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const approval = await prisma.walkInApproval.findUnique({
      where: { id: req.params.id as string },
      include: { plan: true, gym: { select: { name: true } } },
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

    const actor = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { role: true },
    });
    const registeredBy: RegisteredBy =
      actor?.role === "OWNER" ? "OWNER" : "CLERK";

    const existingActive = await prisma.gymMembership.findFirst({
      where: {
        userId: approval.userId,
        gymId: approval.gymId,
        status: { in: ["ACTIVE", "EXPIRING"] },
      },
      select: { id: true },
    });

    let consumedAtMs = Date.now();
    try {
      if (!existingActive) {
        const activated = await activateMembershipFromApproval({
          approval,
          actorId: req.userId!,
          registeredBy,
          isRenewal: false,
          consumeNow: true,
        });
        consumedAtMs = activated.consumedAt?.getTime() ?? Date.now();
      } else {
        const marked = await prisma.walkInApproval.update({
          where: { id: approval.id },
          data: { consumedAt: new Date() },
        });
        consumedAtMs = marked.consumedAt?.getTime() ?? Date.now();
      }
    } catch (err: any) {
      if (err?.message === "DUPLICATE_PAYMENT_REF") {
        sendError(res, "This payment was already applied", 409);
        return;
      }
      throw err;
    }

    await notifyMembershipChange(approval.userId, approval.gymId);
    void emitSalesUpdated(approval.gymId);
    void emitWalkInApprovalsUpdated(approval.gymId);
    void emitAdminGymsUpdated();

    emitWalkInStatus(approval.userId, {
      id: approval.id,
      userId: approval.userId,
      memberName: approval.memberName,
      memberEmail: approval.memberEmail,
      gymId: approval.gymId,
      gymName: gym.name,
      planId: approval.planId,
      planName: approval.planName || approval.plan?.name || "",
      planPrice: approval.planPrice || approval.plan?.price || 0,
      paymentRef: approval.paymentRef,
      totalPaid: approval.totalPaid,
      durationDays: approval.durationDays,
      status: "approved",
      approvalStatus: "approved",
      consumedAt: consumedAtMs,
      isRenewal: Boolean((approval as any).isRenewal),
    });

    sendSuccess(
      res,
      {
        approval: {
          id: approval.id,
          status: "approved",
          consumedAt: consumedAtMs,
          paymentRef: approval.paymentRef,
          totalPaid: approval.totalPaid,
          memberName: approval.memberName,
          planName: approval.planName || approval.plan?.name || "",
          gymName: gym.name,
          isRenewal: Boolean((approval as any).isRenewal),
        },
      },
      "Walk-in completed — membership is now Active.",
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
      planName: updated.planName || updated.plan?.name || "",
      planPrice: updated.planPrice > 0 ? updated.planPrice : updated.plan?.price ?? 0,
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
    void notifyMembershipRejected({
      userId: updated.userId,
      gymId: updated.gymId,
      gymName: updated.gym.name,
      approvalId: updated.id,
      reason: updated.rejectionReason || reason,
    });

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

    const actor = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { role: true, fullName: true },
    });
    const closedByRole = actor?.role === "OWNER" ? "OWNER" : "CLERK";

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
          closedByRole,
          reportDate: reportDateOnly(),
          totalTransactions: openTxns.length,
          totalRevenue,
        },
        include: {
          clerk: { select: { fullName: true } },
          transactions: { orderBy: { createdAt: "asc" } },
        },
      });

      await tx.clerkTransaction.updateMany({
        where: { id: { in: txnIds } },
        data: { dailySalesReportId: created.id },
      });

      return created;
    });

    void emitSalesUpdated(gym.id);

    const closedByLabel = closedByRole === "OWNER" ? "Closed by Owner" : "Closed by Clerk";
    const referenceNo = `DSR-${report.id.slice(0, 8).toUpperCase()}`;

    sendCreated(
      res,
      {
        id: report.id,
        gymId: report.gymId,
        clerkId: report.clerkId,
        closedByRole: report.closedByRole || closedByRole,
        closedByLabel,
        closedByName: report.clerk.fullName || actor?.fullName || "",
        referenceNo,
        date: report.reportDate,
        totalTransactions: report.totalTransactions,
        totalRevenue: report.totalRevenue,
        closedAt: report.closedAt,
        status: "Closed",
        paymentDetails: openTxns.map((txn) => ({
          id: txn.id,
          type: toFrontendTxnType(txn.type),
          memberName: txn.memberName,
          amount: txn.amount,
          method: txn.method === "CASH" ? "Cash" : "Cashless",
          notes: txn.notes,
          createdAt: txn.createdAt,
        })),
      },
      "Daily sales closed successfully",
    );
  } catch (error) {
    console.error("Close daily sales error:", error);
    sendError(res, "Failed to close daily sales", 500);
  }
}

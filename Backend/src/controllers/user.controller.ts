import { Response } from "express";
import prisma from "../config/database";
import { sendSuccess, sendError, sendCreated } from "../utils/apiResponse";
import { AuthRequest } from "../middleware/auth";
import {
  emitWalkInApprovalsUpdated,
  emitWalkInStatus,
} from "../services/realtime.service";

// POST /api/user/join-gym
export async function joinGym(req: AuthRequest, res: Response): Promise<void> {
  try {
    const {
      gymId, planId, coachId, paymentMethod,
      paymentRef, totalPaid, planName, durationDays,
    } = req.body;

    if (!gymId || !paymentMethod) {
      sendError(res, "gymId and paymentMethod are required");
      return;
    }

    if (paymentMethod !== "walk-in") {
      sendError(
        res,
        "Cashless memberships must be paid via Xendit GCash. Use the GCash payment flow.",
        400,
      );
      return;
    }

    const gym = await prisma.gym.findUnique({
      where: { id: gymId },
      include: {
        clerks: { select: { id: true }, take: 1 },
        membershipPlans: { orderBy: { price: "asc" }, take: 1 },
      },
    });
    if (!gym || gym.status !== "ACTIVE") {
      sendError(res, "Gym not found", 404);
      return;
    }

    const existing = await prisma.gymMembership.findFirst({
      where: {
        userId: req.userId!,
        gymId,
        status: { in: ["ACTIVE", "EXPIRING"] },
      },
      select: { id: true },
    });
    if (existing) {
      sendError(res, "You already have an active membership at this gym");
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { id: true, fullName: true, email: true },
    });
    if (!user) {
      sendError(res, "User not found", 404);
      return;
    }

    // Resolve plan: real id → gym's first plan → auto-create Monthly (no fake plan-default)
    let plan = planId
      ? await prisma.membershipPlan.findFirst({ where: { id: planId, gymId } })
      : null;

    if (!plan) {
      plan = gym.membershipPlans[0] ?? null;
    }

    if (!plan) {
      const price = Number(totalPaid) || gym.pricePerMonth || 0;
      plan = await prisma.membershipPlan.create({
        data: {
          gymId,
          name: String(planName || "Monthly").trim() || "Monthly",
          price,
          durationDays: Math.max(1, Number(durationDays) || 30),
        },
      });
    }

    const coach = coachId
      ? await prisma.coach.findFirst({ where: { id: coachId, gymId } })
      : null;

    const assignedTo = gym.clerks.length > 0 ? "CLERK" : "OWNER";

    // Idempotent pending
    const pendingApproval = await prisma.walkInApproval.findFirst({
      where: { userId: req.userId!, gymId, status: "PENDING" },
      include: {
        plan: { select: { name: true, price: true } },
        gym: { select: { name: true } },
      },
    });
    if (pendingApproval) {
      sendSuccess(
        res,
        { approval: shapeWalkInApproval(pendingApproval, gym.name), assignedTo },
        "You already have a pending walk-in request",
      );
      return;
    }

    const approvedOpen = await prisma.walkInApproval.findFirst({
      where: {
        userId: req.userId!,
        gymId,
        status: "APPROVED",
        consumedAt: null,
      },
      include: {
        plan: { select: { name: true, price: true } },
        gym: { select: { name: true } },
      },
    });
    if (approvedOpen) {
      sendSuccess(
        res,
        { approval: shapeWalkInApproval(approvedOpen, gym.name), assignedTo },
        "Your walk-in request was approved. Click Done to continue.",
      );
      return;
    }

    const ref = String(paymentRef || `WI-${Date.now()}`).trim();
    const amount = Number(totalPaid) || plan.price + (coach?.sessionPrice || 0);

    const approval = await prisma.walkInApproval.create({
      data: {
        userId: req.userId!,
        gymId,
        planId: plan.id,
        memberName: user.fullName,
        memberEmail: user.email,
        coachId: coach?.id || null,
        coachName: coach?.name || null,
        coachSessionPrice: coach?.sessionPrice || 0,
        paymentRef: ref,
        totalPaid: amount,
        durationDays: plan.durationDays,
        paymentStatus: "PAID",
        status: "PENDING",
      },
      include: {
        plan: { select: { name: true, price: true } },
        gym: { select: { name: true } },
      },
    });

    const shaped = shapeWalkInApproval(approval, gym.name);
    emitWalkInStatus(req.userId!, shaped);
    void emitWalkInApprovalsUpdated(gymId);

    sendCreated(
      res,
      { approval: shaped, assignedTo },
      "Walk-in payment recorded — waiting for Owner/Clerk approval",
    );
  } catch (error) {
    console.error("Join gym error:", error);
    sendError(res, "Failed to join gym", 500);
  }
}

function shapeWalkInApproval(
  a: {
    id: string;
    userId: string;
    memberName: string;
    memberEmail: string;
    gymId: string;
    planId: string;
    coachId: string | null;
    coachName: string | null;
    coachSessionPrice: number;
    paymentRef: string;
    totalPaid: number;
    durationDays: number;
    status: string;
    paymentStatus?: string;
    rejectionReason?: string;
    submittedAt: Date;
    reviewedAt: Date | null;
    consumedAt: Date | null;
    plan?: { name: string; price: number };
    gym?: { name: string };
  },
  gymNameFallback?: string,
) {
  return {
    id: a.id,
    userId: a.userId,
    memberName: a.memberName,
    memberEmail: a.memberEmail,
    gymId: a.gymId,
    gymName: a.gym?.name || gymNameFallback || "",
    planId: a.planId,
    planName: a.plan?.name || "",
    planPrice: a.plan?.price ?? 0,
    coachId: a.coachId,
    coachName: a.coachName,
    coachSessionPrice: a.coachSessionPrice,
    paymentRef: a.paymentRef,
    totalPaid: a.totalPaid,
    durationDays: a.durationDays,
    paymentStatus: String(a.paymentStatus || "PAID").toLowerCase(),
    approvalStatus: String(a.status).toLowerCase(),
    status: String(a.status).toLowerCase(),
    rejectionReason: a.rejectionReason || "",
    submittedAt: a.submittedAt.getTime(),
    reviewedAt: a.reviewedAt?.getTime() ?? null,
    consumedAt: a.consumedAt?.getTime() ?? null,
  };
}

// GET /api/user/membership
export async function getMembership(req: AuthRequest, res: Response): Promise<void> {
  try {
    const membership = await prisma.gymMembership.findFirst({
      where: {
        userId: req.userId!,
        status: { in: ["ACTIVE", "EXPIRING"] },
      },
      include: {
        gym: { select: { id: true, name: true, coverImageUrl: true } },
        plan: { select: { name: true, price: true, durationDays: true } },
        coach: { select: { name: true, sessionPrice: true } },
      },
      orderBy: { joinedAt: "desc" },
    });

    if (!membership) {
      sendSuccess(res, null, "No active membership");
      return;
    }

    sendSuccess(res, {
      gymId: membership.gym.id,
      gymName: membership.gym.name,
      planId: membership.planId,
      planName: membership.plan.name,
      planPrice: membership.plan.price,
      coachId: membership.coachId,
      coachName: membership.coach?.name || null,
      coachSessionPrice: membership.coach?.sessionPrice || 0,
      paymentMethod: membership.paymentMethod,
      paymentRef: membership.paymentRef,
      totalPaid: membership.totalPaid,
      joinedAt: membership.joinedAt.toISOString(),
      durationDays: membership.plan.durationDays,
    });
  } catch (error) {
    console.error("Get membership error:", error);
    sendError(res, "Failed to fetch membership", 500);
  }
}

// DELETE /api/user/membership
export async function leaveMembership(req: AuthRequest, res: Response): Promise<void> {
  try {
    const membership = await prisma.gymMembership.findFirst({
      where: { userId: req.userId!, status: { in: ["ACTIVE", "EXPIRING"] } },
    });

    if (!membership) {
      sendError(res, "No active membership to leave", 404);
      return;
    }

    await prisma.gymMembership.update({
      where: { id: membership.id },
      data: { status: "EXPIRED" },
    });

    sendSuccess(res, null, "Left the gym successfully");
  } catch (error) {
    console.error("Leave membership error:", error);
    sendError(res, "Failed to leave gym", 500);
  }
}

// GET /api/user/messages
export async function getMessages(req: AuthRequest, res: Response): Promise<void> {
  try {
    const membership = await prisma.gymMembership.findFirst({
      where: { userId: req.userId!, status: { in: ["ACTIVE", "EXPIRING"] } },
    });

    if (!membership) {
      sendSuccess(res, []);
      return;
    }

    const conversations = await prisma.conversation.findMany({
      where: { gymId: membership.gymId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          include: { sender: { select: { id: true, fullName: true, role: true } } },
        },
      },
    });

    sendSuccess(res, conversations);
  } catch (error) {
    console.error("Get user messages error:", error);
    sendError(res, "Failed to fetch messages", 500);
  }
}

// POST /api/user/messages
export async function sendUserMessage(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { conversationId, text, gymId } = req.body;

    let convId = conversationId;

    // Create conversation if needed
    if (!convId && gymId) {
      const conv = await prisma.conversation.create({
        data: { gymId, type: "MEMBER" },
      });
      convId = conv.id;
    }

    if (!convId) {
      sendError(res, "Conversation ID or gym ID required");
      return;
    }

    const message = await prisma.message.create({
      data: {
        conversationId: convId,
        senderId: req.userId!,
        senderRole: "user",
        text,
      },
    });

    sendCreated(res, { message, conversationId: convId }, "Message sent");
  } catch (error) {
    console.error("Send user message error:", error);
    sendError(res, "Failed to send message", 500);
  }
}

// POST /api/user/ai-chat
export async function aiChat(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { message } = req.body;
    const lower = message.toLowerCase();

    let reply: string;

    if (lower.includes("workout") || lower.includes("exercise") || lower.includes("train")) {
      reply = "For balanced progress, aim for 3–4 strength sessions per week with compound lifts like squats, presses, and rows. Add 1–2 cardio or mobility days for recovery.";
    } else if (lower.includes("nutrition") || lower.includes("protein") || lower.includes("diet")) {
      reply = "A practical starting point is 1.6–2.2g of protein per kg of body weight daily, plus whole foods around your training window. Stay consistent before optimizing supplements.";
    } else if (lower.includes("recovery") || lower.includes("rest") || lower.includes("sleep")) {
      reply = "Recovery is where gains happen. Target 7–9 hours of sleep, hydrate well, and schedule at least one full rest day. Light walking and stretching help too.";
    } else {
      reply = "Great question! I can help with workout plans, nutrition basics, recovery habits, and gym-related guidance. Tell me your goal and I'll suggest a simple next step.";
    }

    sendSuccess(res, { reply });
  } catch (error) {
    console.error("AI chat error:", error);
    sendError(res, "Failed to process message", 500);
  }
}

// GET /api/user/walk-in-status
export async function getWalkInStatus(req: AuthRequest, res: Response): Promise<void> {
  try {
    const approvals = await prisma.walkInApproval.findMany({
      where: { userId: req.userId! },
      include: {
        gym: { select: { name: true } },
        plan: { select: { name: true, price: true } },
      },
      orderBy: { submittedAt: "desc" },
    });

    sendSuccess(
      res,
      approvals.map((a) => shapeWalkInApproval(a)),
    );
  } catch (error) {
    console.error("Get walk-in status error:", error);
    sendError(res, "Failed to fetch status", 500);
  }
}

// POST /api/user/walk-in-done/:id — gymer clicks Done after approval
export async function completeWalkInOnboarding(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    const approval = await prisma.walkInApproval.findUnique({
      where: { id: req.params.id as string },
      include: {
        gym: { select: { name: true } },
        plan: { select: { name: true, price: true } },
      },
    });

    if (!approval || approval.userId !== req.userId!) {
      sendError(res, "Not found", 404);
      return;
    }

    if (approval.status !== "APPROVED") {
      sendError(res, "Membership is not approved yet");
      return;
    }

    const membership = await prisma.gymMembership.findFirst({
      where: {
        userId: req.userId!,
        gymId: approval.gymId,
        status: { in: ["ACTIVE", "EXPIRING"] },
      },
    });

    if (!membership) {
      sendError(res, "Active membership not found. Contact the gym.");
      return;
    }

    const updated = approval.consumedAt
      ? approval
      : await prisma.walkInApproval.update({
          where: { id: approval.id },
          data: { consumedAt: new Date() },
          include: {
            gym: { select: { name: true } },
            plan: { select: { name: true, price: true } },
          },
        });

    sendSuccess(
      res,
      {
        approval: shapeWalkInApproval(updated),
        membership: {
          gymId: membership.gymId,
          gymName: updated.gym.name,
          planId: membership.planId,
          planName: updated.plan.name,
          planPrice: updated.plan.price,
          paymentMethod: "walk-in",
          paymentRef: membership.paymentRef,
          totalPaid: membership.totalPaid,
          joinedAt: membership.joinedAt.toISOString(),
          durationDays: approval.durationDays,
        },
      },
      "Onboarding complete",
    );
  } catch (error) {
    console.error("Complete walk-in onboarding error:", error);
    sendError(res, "Failed to complete onboarding", 500);
  }
}

async function getActiveMembershipGymId(userId: string): Promise<string | null> {
  const membership = await prisma.gymMembership.findFirst({
    where: {
      userId,
      status: { in: ["ACTIVE", "EXPIRING"] },
    },
    select: { gymId: true },
    orderBy: { joinedAt: "desc" },
  });
  return membership?.gymId ?? null;
}

// GET /api/user/exercises — member-only for the gymer's joined gym
export async function getMemberExercises(req: AuthRequest, res: Response): Promise<void> {
  try {
    const gymId = await getActiveMembershipGymId(req.userId!);
    if (!gymId) {
      sendError(res, "Active membership required", 403);
      return;
    }

    const exercises = await prisma.exercise.findMany({
      where: { gymId },
      orderBy: { createdAt: "desc" },
    });

    sendSuccess(res, exercises);
  } catch (error) {
    console.error("Get member exercises error:", error);
    sendError(res, "Failed to fetch exercises", 500);
  }
}

// GET /api/user/equipment — member-only for the gymer's joined gym
export async function getMemberEquipment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const gymId = await getActiveMembershipGymId(req.userId!);
    if (!gymId) {
      sendError(res, "Active membership required", 403);
      return;
    }

    const equipment = await prisma.equipment.findMany({
      where: { gymId },
      orderBy: { name: "asc" },
    });

    sendSuccess(res, equipment);
  } catch (error) {
    console.error("Get member equipment error:", error);
    sendError(res, "Failed to fetch equipment", 500);
  }
}

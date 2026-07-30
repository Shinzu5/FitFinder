import { Response } from "express";
import prisma from "../config/database";
import { sendSuccess, sendError, sendCreated } from "../utils/apiResponse";
import { AuthRequest } from "../middleware/auth";

// POST /api/user/join-gym
export async function joinGym(req: AuthRequest, res: Response): Promise<void> {
  try {
    const {
      gymId, planId, coachId, paymentMethod,
      paymentRef, totalPaid,
    } = req.body;

    const plan = await prisma.membershipPlan.findUnique({ where: { id: planId } });
    if (!plan) { sendError(res, "Plan not found", 404); return; }

    const gym = await prisma.gym.findUnique({ where: { id: gymId } });
    if (!gym) { sendError(res, "Gym not found", 404); return; }

    // Check for existing active membership at this gym
    const existing = await prisma.gymMembership.findFirst({
      where: {
        userId: req.userId!,
        gymId,
        status: { in: ["ACTIVE", "EXPIRING"] },
      },
    });

    if (existing) {
      sendError(res, "You already have an active membership at this gym");
      return;
    }

    // If walk-in, create approval request instead of direct membership
    if (paymentMethod === "walk-in") {
      const user = await prisma.user.findUnique({ where: { id: req.userId! } });
      const coach = coachId ? await prisma.coach.findUnique({ where: { id: coachId } }) : null;

      // Check for existing pending approval
      const pendingApproval = await prisma.walkInApproval.findFirst({
        where: { userId: req.userId!, gymId, status: "PENDING" },
      });

      if (pendingApproval) {
        sendSuccess(res, { approval: pendingApproval }, "You already have a pending walk-in request");
        return;
      }

      // Also block if already approved but payment not yet confirmed at front desk
      const awaitingPayment = await prisma.walkInApproval.findFirst({
        where: {
          userId: req.userId!,
          gymId,
          status: "APPROVED",
          consumedAt: null,
        },
      });

      if (awaitingPayment) {
        sendSuccess(
          res,
          { approval: awaitingPayment },
          "Your walk-in request was approved. Complete payment at the front desk.",
        );
        return;
      }

      const approval = await prisma.walkInApproval.create({
        data: {
          userId: req.userId!,
          gymId,
          planId,
          memberName: user!.fullName,
          memberEmail: user!.email,
          coachId: coachId || null,
          coachName: coach?.name || null,
          coachSessionPrice: coach?.sessionPrice || 0,
          paymentRef: paymentRef || `WI-${Date.now()}`,
          totalPaid: totalPaid || plan.price + (coach?.sessionPrice || 0),
          durationDays: plan.durationDays,
        },
      });

      sendCreated(res, { approval }, "Walk-in request submitted for clerk approval");
      return;
    }

    // Cashless memberships are activated only after successful Xendit payment
    // (see /api/payments/create-gcash + webhook / status poll).
    sendError(
      res,
      "Cashless memberships must be paid via Xendit GCash. Use the GCash payment flow.",
      400,
    );
  } catch (error) {
    console.error("Join gym error:", error);
    sendError(res, "Failed to join gym", 500);
  }
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
      approvals.map((a) => ({
        id: a.id,
        userId: a.userId,
        memberName: a.memberName,
        memberEmail: a.memberEmail,
        gymId: a.gymId,
        gymName: a.gym.name,
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
        consumedAt: a.consumedAt?.getTime(),
      })),
    );
  } catch (error) {
    console.error("Get walk-in status error:", error);
    sendError(res, "Failed to fetch status", 500);
  }
}

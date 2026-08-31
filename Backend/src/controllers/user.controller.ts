import { Response } from "express";
import prisma from "../config/database";
import { sendSuccess, sendError, sendCreated } from "../utils/apiResponse";
import { AuthRequest } from "../middleware/auth";
import {
  emitMembershipUpdated,
} from "../services/realtime.service";
import { generateAiResponse } from "../services/ai.service";
import {
  ensureActiveGymIfEmpty,
  listLiveMemberships,
  listEnrolledMemberships,
  resolveActiveGymId,
  setActiveGymId,
  shapeEnrolledMembership,
} from "../services/activeGym.service";
import {
  createPendingApproval,
  shapeApprovalPayload,
} from "../services/membershipApproval.service";

// POST /api/user/join-gym
export async function joinGym(req: AuthRequest, res: Response): Promise<void> {
  try {
    const {
      gymId, planId, coachId, paymentMethod,
      paymentRef, totalPaid,
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
        membershipPlans: { where: { isActive: true }, orderBy: { price: "asc" }, take: 1 },
      },
    });
    if (!gym || gym.status !== "ACTIVE") {
      sendError(res, "Gym not found", 404);
      return;
    }

    // Renewal only while a live membership still exists at this gym — multi-gym allowed
    const existingAtGym = await prisma.gymMembership.findFirst({
      where: {
        userId: req.userId!,
        gymId,
        status: { in: ["ACTIVE", "EXPIRING"] },
        expiresAt: { gt: new Date() },
      },
      orderBy: { joinedAt: "desc" },
      select: { id: true, status: true, expiresAt: true },
    });
    const isRenewal = Boolean(existingAtGym);

    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { id: true, fullName: true, email: true },
    });
    if (!user) {
      sendError(res, "User not found", 404);
      return;
    }

    // Resolve plan: active id → gym's first active plan → auto-create Monthly
    let plan = planId
      ? await prisma.membershipPlan.findFirst({
          where: { id: planId, gymId, isActive: true },
        })
      : null;

    if (planId && !plan) {
      sendError(res, "This membership plan is no longer available", 400);
      return;
    }

    if (!plan) {
      plan = gym.membershipPlans[0] ?? null;
    }

    if (!plan) {
      sendError(res, "No membership plans available.", 400);
      return;
    }

    let coach = null;
    if (coachId) {
      coach = await prisma.coach.findFirst({
        where: { id: coachId, gymId, isActive: true },
      });
      if (!coach) {
        sendError(
          res,
          "Selected coach is no longer available. Please choose another coach or continue without one.",
          400,
        );
        return;
      }
    }

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
        isRenewal
          ? "You already have a pending renewal request"
          : "You already have a pending walk-in request",
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

    const { approval, shaped } = await createPendingApproval({
      userId: req.userId!,
      gymId,
      planId: plan.id,
      planName: plan.name,
      planPrice: plan.price,
      memberName: user.fullName,
      memberEmail: user.email,
      coachId: coach?.id || null,
      coachName: coach?.name || null,
      coachSessionPrice: coach?.sessionPrice || 0,
      paymentRef: ref,
      totalPaid: amount,
      durationDays: plan.durationDays,
      isRenewal,
      paymentMethod: "WALK_IN",
    });

    sendCreated(
      res,
      { approval: shaped, assignedTo, isRenewal },
      isRenewal
        ? "Renewal payment recorded — waiting for Owner/Clerk approval"
        : "Walk-in payment recorded — waiting for Owner/Clerk approval",
    );
  } catch (error) {
    console.error("Join gym error:", error);
    sendError(res, "Failed to join gym", 500);
  }
}

function shapeWalkInApproval(
  a: Parameters<typeof shapeApprovalPayload>[0],
  gymNameFallback?: string,
) {
  return shapeApprovalPayload(a, gymNameFallback);
}

// GET /api/user/membership — currently selected (active) gym membership
export async function getMembership(req: AuthRequest, res: Response): Promise<void> {
  try {
    const activeGymId = await resolveActiveGymId(req.userId!);
    if (!activeGymId) {
      sendSuccess(res, null, "No active membership");
      return;
    }

    const membership = await prisma.gymMembership.findFirst({
      where: {
        userId: req.userId!,
        gymId: activeGymId,
        status: { in: ["ACTIVE", "EXPIRING"] },
        expiresAt: { gt: new Date() },
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

    const planName = membership.planName || membership.plan?.name || "";
    const planPrice =
      membership.planPrice > 0 ? membership.planPrice : membership.plan?.price ?? 0;
    const durationDays =
      membership.durationDays > 0
        ? membership.durationDays
        : membership.plan?.durationDays ?? 0;

    const renewals = await prisma.walkInApproval.findMany({
      where: {
        userId: req.userId!,
        gymId: membership.gymId,
        status: "APPROVED",
        isRenewal: true,
      },
      orderBy: { reviewedAt: "desc" },
      take: 20,
    });

    const live = await listLiveMemberships(req.userId!);

    sendSuccess(res, {
      gymId: membership.gym.id,
      gymName: membership.gym.name,
      planId: membership.planId,
      planName,
      planPrice,
      coachId: membership.coachId,
      coachName: membership.coach?.name || null,
      coachSessionPrice: membership.coach?.sessionPrice || 0,
      paymentMethod: membership.paymentMethod,
      paymentRef: membership.paymentRef,
      totalPaid: membership.totalPaid,
      joinedAt: membership.joinedAt.toISOString(),
      expiresAt: membership.expiresAt.toISOString(),
      durationDays,
      activeGymId,
      enrolledGymIds: live.map((m) => m.gymId),
      renewalHistory: renewals.map((r: any) => ({
        id: r.id,
        planName: r.planName,
        planPrice: r.planPrice,
        durationDays: r.durationDays,
        totalPaid: r.totalPaid,
        paymentMethod:
          String(r.paymentMethod || "WALK_IN").toUpperCase() === "XENDIT"
            ? "Cashless"
            : "Walk-in",
        renewalDate: (r.reviewedAt || r.submittedAt).toISOString(),
      })),
    });
  } catch (error) {
    console.error("Get membership error:", error);
    sendError(res, "Failed to fetch membership", 500);
  }
}

// GET /api/user/memberships — all live enrolled gyms (switcher)
export async function getMemberships(req: AuthRequest, res: Response): Promise<void> {
  try {
    const activeGymId = await resolveActiveGymId(req.userId!);
    const enrolled = await listEnrolledMemberships(req.userId!);
    sendSuccess(
      res,
      {
        activeGymId,
        memberships: enrolled.map((m) => shapeEnrolledMembership(m, activeGymId)),
      },
      "Enrolled gyms",
    );
  } catch (error) {
    console.error("Get memberships error:", error);
    sendError(res, "Failed to fetch enrolled gyms", 500);
  }
}

// PATCH /api/user/active-gym — switch selected gym session
export async function switchActiveGym(req: AuthRequest, res: Response): Promise<void> {
  try {
    const gymId = String(req.body?.gymId || "").trim();
    if (!gymId) {
      sendError(res, "gymId is required");
      return;
    }

    const result = await setActiveGymId(req.userId!, gymId);
    if (!result.ok) {
      sendError(res, result.message, result.status);
      return;
    }

    sendSuccess(res, { gymId: result.gymId }, "Active gym updated");
  } catch (error) {
    console.error("Switch active gym error:", error);
    sendError(res, "Failed to switch gym", 500);
  }
}

// DELETE /api/user/membership — leave currently selected gym only
export async function leaveMembership(req: AuthRequest, res: Response): Promise<void> {
  try {
    const activeGymId = await resolveActiveGymId(req.userId!);
    if (!activeGymId) {
      sendError(res, "No active membership to leave", 404);
      return;
    }

    const membership = await prisma.gymMembership.findFirst({
      where: {
        userId: req.userId!,
        gymId: activeGymId,
        status: { in: ["ACTIVE", "EXPIRING"] },
      },
    });

    if (!membership) {
      sendError(res, "No active membership to leave", 404);
      return;
    }

    await prisma.gymMembership.update({
      where: { id: membership.id },
      data: { status: "EXPIRED" },
    });

    await prisma.user.updateMany({
      where: { id: req.userId!, activeGymId },
      data: { activeGymId: null },
    });
    await resolveActiveGymId(req.userId!);

    emitMembershipUpdated(req.userId!);
    sendSuccess(res, null, "Left the gym successfully");
  } catch (error) {
    console.error("Leave membership error:", error);
    sendError(res, "Failed to leave gym", 500);
  }
}

// GET /api/user/messages
export async function getMessages(req: AuthRequest, res: Response): Promise<void> {
  try {
    const gymId = await resolveActiveGymId(req.userId!);

    if (!gymId) {
      sendSuccess(res, []);
      return;
    }

    const conversations = await prisma.conversation.findMany({
      where: { gymId },
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
    const { message, history } = req.body;

    if (!message || typeof message !== "string") {
      sendError(res, "Invalid message", 400);
      return;
    }

    const reply = await generateAiResponse(message, {
      userId: req.userId!,
      history,
    });

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
      approvals.map((a: any) => shapeWalkInApproval(a)),
    );
  } catch (error) {
    console.error("Get walk-in status error:", error);
    sendError(res, "Failed to fetch status", 500);
  }
}

// POST /api/user/walk-in-done/:id — gymer Done after approval → ACTIVE
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

    // Idempotent: already activated
    if (approval.status === "APPROVED" && approval.consumedAt) {
      const membership = await prisma.gymMembership.findFirst({
        where: {
          userId: req.userId!,
          gymId: approval.gymId,
          status: { in: ["ACTIVE", "EXPIRING"] },
        },
      });
      if (membership) {
        await ensureActiveGymIfEmpty(req.userId!, approval.gymId);
        sendSuccess(
          res,
          {
            approval: shapeWalkInApproval(approval),
            membership: {
              gymId: membership.gymId,
              gymName: approval.gym.name,
              planId: membership.planId,
              planName: membership.planName || approval.planName || approval.plan?.name || "",
              planPrice: membership.planPrice || approval.planPrice || approval.plan?.price || 0,
              paymentMethod: "walk-in",
              paymentRef: membership.paymentRef,
              totalPaid: membership.totalPaid,
              joinedAt: membership.joinedAt.toISOString(),
              expiresAt: membership.expiresAt.toISOString(),
              durationDays: membership.durationDays || approval.durationDays,
            },
          },
          "Membership already activated",
        );
        return;
      }
    }

    const { activateFromApproval } = await import("../services/membershipApproval.service");
    const result = await activateFromApproval({
      approvalId: approval.id,
      actorId: req.userId!,
      registeredBy: "SELF",
    });
    if (!result.ok) {
      sendError(res, result.message, result.status);
      return;
    }

    sendSuccess(
      res,
      {
        approval: result.shaped,
        membership: {
          gymId: result.membership.gymId,
          gymName: result.shaped.gymName,
          planId: result.membership.planId,
          planName:
            result.membership.planName ||
            result.shaped.planName ||
            "",
          planPrice:
            result.membership.planPrice ||
            result.shaped.planPrice ||
            0,
          paymentMethod: "walk-in",
          paymentRef: result.membership.paymentRef,
          totalPaid: result.membership.totalPaid,
          joinedAt: result.membership.joinedAt.toISOString(),
          expiresAt: result.membership.expiresAt.toISOString(),
          durationDays: result.membership.durationDays || approval.durationDays,
        },
      },
      "Membership activated",
    );
  } catch (error) {
    console.error("Complete walk-in onboarding error:", error);
    sendError(res, "Failed to complete onboarding", 500);
  }
}

// GET /api/user/exercises — member-only for the gymer's selected gym
export async function getMemberExercises(req: AuthRequest, res: Response): Promise<void> {
  try {
    const gymId = await resolveActiveGymId(req.userId!);
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

// GET /api/user/equipment — member-only for the gymer's selected gym
export async function getMemberEquipment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const gymId = await resolveActiveGymId(req.userId!);
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

// GET /api/user/shop — member-only products for the gymer's selected gym
export async function getMemberShop(req: AuthRequest, res: Response): Promise<void> {
  try {
    const gymId = await resolveActiveGymId(req.userId!);
    if (!gymId) {
      sendError(res, "Active membership required", 403);
      return;
    }

    const products = await prisma.shopProduct.findMany({
      where: { gymId },
      orderBy: { createdAt: "desc" },
    });

    sendSuccess(res, products);
  } catch (error) {
    console.error("Get member shop error:", error);
    sendError(res, "Failed to fetch shop products", 500);
  }
}

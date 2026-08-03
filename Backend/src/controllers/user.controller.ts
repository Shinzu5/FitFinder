import { Response } from "express";
import prisma from "../config/database";
import { sendSuccess, sendError, sendCreated } from "../utils/apiResponse";
import { AuthRequest } from "../middleware/auth";
import {
  emitMembershipUpdated,
  emitWalkInApprovalsUpdated,
  emitWalkInStatus,
} from "../services/realtime.service";
import { expireOverdueMemberships } from "../services/membershipAccess.service";
import { notifyMembershipRequestSubmitted } from "../services/membershipNotification.service";
import { generateAiResponse } from "../services/ai.service";

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

    // Active membership at another gym blocks join; same gym = renewal request
    const activeElsewhere = await prisma.gymMembership.findFirst({
      where: {
        userId: req.userId!,
        status: { in: ["ACTIVE", "EXPIRING"] },
        gymId: { not: gymId },
        expiresAt: { gt: new Date() },
      },
      select: { id: true, gymId: true },
    });
    if (activeElsewhere) {
      sendError(res, "You already have an active membership at another gym", 400);
      return;
    }

    // Renewal only while a live membership still exists — expired rows are new joins
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

    const approval = await prisma.walkInApproval.create({
      data: {
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
    void notifyMembershipRequestSubmitted({
      userId: req.userId!,
      gymId,
      gymName: gym.name,
      approvalId: approval.id,
      memberName: user.fullName,
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
  a: {
    id: string;
    userId: string;
    memberName: string;
    memberEmail: string;
    gymId: string;
    planId: string | null;
    planName?: string;
    planPrice?: number;
    coachId: string | null;
    coachName: string | null;
    coachSessionPrice: number;
    paymentRef: string;
    totalPaid: number;
    durationDays: number;
    isRenewal?: boolean;
    paymentMethod?: string;
    status: string;
    paymentStatus?: string;
    rejectionReason?: string;
    submittedAt: Date;
    reviewedAt: Date | null;
    consumedAt: Date | null;
    plan?: { name: string; price: number } | null;
    gym?: { name: string };
  },
  gymNameFallback?: string,
) {
  const method = String(a.paymentMethod || "WALK_IN").toUpperCase();
  return {
    id: a.id,
    userId: a.userId,
    memberName: a.memberName,
    memberEmail: a.memberEmail,
    gymId: a.gymId,
    gymName: a.gym?.name || gymNameFallback || "",
    planId: a.planId,
    planName: a.planName || a.plan?.name || "",
    planPrice: a.planPrice && a.planPrice > 0 ? a.planPrice : a.plan?.price ?? 0,
    coachId: a.coachId,
    coachName: a.coachName,
    coachSessionPrice: a.coachSessionPrice,
    paymentRef: a.paymentRef,
    totalPaid: a.totalPaid,
    durationDays: a.durationDays,
    isRenewal: Boolean(a.isRenewal),
    paymentMethod: method === "XENDIT" ? "Cashless" : "Walk-in",
    paymentMethodRaw: method,
    paymentStatus: String(a.paymentStatus || "PAID").toLowerCase(),
    approvalStatus: String(a.status).toLowerCase(),
    status: String(a.status).toLowerCase(),
    rejectionReason: a.rejectionReason || "",
    submittedAt: a.submittedAt.getTime(),
    reviewedAt: a.reviewedAt?.getTime() ?? null,
    consumedAt: a.consumedAt?.getTime() ?? null,
    renewalDate: a.submittedAt.getTime(),
  };
}

// GET /api/user/membership
export async function getMembership(req: AuthRequest, res: Response): Promise<void> {
  try {
    await expireOverdueMemberships(req.userId!);

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
    
    if (!message || typeof message !== "string") {
      sendError(res, "Invalid message", 400);
      return;
    }

    const reply = await generateAiResponse(message);
    
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

// POST /api/user/walk-in-done/:id — gymer Done after approval → activate membership
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

    let membership = await prisma.gymMembership.findFirst({
      where: {
        userId: req.userId!,
        gymId: approval.gymId,
        status: { in: ["ACTIVE", "EXPIRING"] },
      },
    });

    // New walk-in joins: membership is created here (not on Approve)
    if (!membership) {
      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setDate(expiresAt.getDate() + approval.durationDays);

      const payMethodRaw = String((approval as any).paymentMethod || "WALK_IN").toUpperCase();
      let liveCoachId: string | null = approval.coachId;
      if (approval.coachId) {
        const liveCoach = await prisma.coach.findFirst({
          where: {
            id: approval.coachId,
            gymId: approval.gymId,
            isActive: true,
          },
          select: { id: true },
        });
        if (!liveCoach) liveCoachId = null;
      }

      await prisma.$transaction(async (tx: any) => {
        const { upsertGymMembership } = await import("../services/gymMembership.service");
        membership = await upsertGymMembership(
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
            memberType: payMethodRaw === "XENDIT" ? "ONLINE" : "WALK_IN",
            registeredBy: "SELF",
            registeredById: approval.userId,
            expiresAt,
            startsAt: now,
            status: "ACTIVE",
          },
          tx,
        );

        const dupTxn = await tx.clerkTransaction.findFirst({
          where: {
            gymId: approval.gymId,
            notes: { contains: approval.paymentRef },
          },
          select: { id: true },
        });
        if (!dupTxn) {
          const gym = await tx.gym.findUnique({
            where: { id: approval.gymId },
            select: { ownerId: true },
          });
          if (gym?.ownerId) {
            await tx.clerkTransaction.create({
              data: {
                gymId: approval.gymId,
                clerkId: gym.ownerId,
                type: "MONTHLY",
                memberName: approval.memberName,
                amount: approval.totalPaid,
                method: payMethodRaw === "XENDIT" ? "XENDIT" : "CASH",
                notes: `Membership activated · Ref ${approval.paymentRef}`,
              },
            });
          }
        }

        await tx.walkInApproval.update({
          where: { id: approval.id },
          data: { consumedAt: now },
        });
      });

      const { notifyMembershipChange } = await import("../services/gymMembership.service");
      const { emitSalesUpdated, emitWalkInApprovalsUpdated } = await import(
        "../services/realtime.service"
      );
      await notifyMembershipChange(approval.userId, approval.gymId);
      void emitSalesUpdated(approval.gymId);
      void emitWalkInApprovalsUpdated(approval.gymId);

      membership = await prisma.gymMembership.findFirst({
        where: {
          userId: req.userId!,
          gymId: approval.gymId,
          status: { in: ["ACTIVE", "EXPIRING"] },
        },
      });
    } else if (!approval.consumedAt) {
      await prisma.walkInApproval.update({
        where: { id: approval.id },
        data: { consumedAt: new Date() },
      });
      emitMembershipUpdated(req.userId!);
    }

    if (!membership) {
      sendError(res, "Could not activate membership. Contact the gym.");
      return;
    }

    const updated = await prisma.walkInApproval.findUnique({
      where: { id: approval.id },
      include: {
        gym: { select: { name: true } },
        plan: { select: { name: true, price: true } },
      },
    });

    sendSuccess(
      res,
      {
        approval: shapeWalkInApproval(updated || approval),
        membership: {
          gymId: membership.gymId,
          gymName: updated?.gym.name || approval.gym.name,
          planId: membership.planId,
          planName:
            membership.planName ||
            updated?.planName ||
            updated?.plan?.name ||
            "",
          planPrice:
            membership.planPrice ||
            updated?.planPrice ||
            updated?.plan?.price ||
            0,
          paymentMethod: "walk-in",
          paymentRef: membership.paymentRef,
          totalPaid: membership.totalPaid,
          joinedAt: membership.joinedAt.toISOString(),
          expiresAt: membership.expiresAt.toISOString(),
          durationDays: membership.durationDays || approval.durationDays,
        },
      },
      "Membership activated",
    );
  } catch (error) {
    console.error("Complete walk-in onboarding error:", error);
    sendError(res, "Failed to complete onboarding", 500);
  }
}

async function getActiveMembershipGymId(userId: string): Promise<string | null> {
  await expireOverdueMemberships(userId);
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

// GET /api/user/shop — member-only products for the gymer's joined gym
export async function getMemberShop(req: AuthRequest, res: Response): Promise<void> {
  try {
    const gymId = await getActiveMembershipGymId(req.userId!);
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

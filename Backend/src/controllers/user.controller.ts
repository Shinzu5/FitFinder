import { Response } from "express";
import { sendSuccess, sendError, sendCreated } from "@/utils/apiResponse";
import { AuthRequest } from "@/types/common";
import { GenerateAiResponseService } from "@/services/ai";
import {
  ListEnrolledMembershipsService,
  ResolveActiveGymService,
  SetActiveGymService,
  ShapeEnrolledMembershipService,
} from "@/services/gym";
import {
  CompleteWalkInService,
  GetMembershipService,
  GetWalkInStatusService,
  JoinGymService,
  LeaveMembershipService,
  ShapeApprovalPayloadService,
} from "@/services/membership";
import { GetMemberMessagesService, SendUserMessageService } from "@/services/messaging";
import { ListMemberEquipmentService, ListMemberExercisesService, ListMemberShopService } from "@/services/catalog";

function shapeWalkInApproval(
  a: Parameters<typeof ShapeApprovalPayloadService>[0],
  gymNameFallback?: string,
) {
  return ShapeApprovalPayloadService(a, gymNameFallback);
}

export class UserController {
  // POST /api/user/join-gym
  public joinGym = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const {
        gymId, planId, coachId, paymentMethod,
        paymentRef, totalPaid,
      } = req.body;

      const result = await JoinGymService({
        userId: req.userId!,
        gymId,
        planId,
        coachId,
        paymentMethod,
        paymentRef,
        totalPaid,
      });

      if (result.kind === "error") {
        sendError(res, result.message, result.status);
        return;
      }

      if (result.kind === "created") {
        sendCreated(
          res,
          {
            approval: result.approval,
            assignedTo: result.assignedTo,
            isRenewal: result.isRenewal,
          },
          result.message,
        );
        return;
      }

      sendSuccess(
        res,
        { approval: result.approval, assignedTo: result.assignedTo },
        result.message,
      );
    } catch (error) {
      console.error("Join gym error:", error);
      sendError(res, "Failed to join gym", 500);
    }
  };

  // GET /api/user/membership — currently selected (active) gym membership
  public getMembership = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const result = await GetMembershipService(req.userId!);

      if (!result.membership) {
        sendSuccess(res, null, "No active membership");
        return;
      }

      const { activeGymId, membership, renewals, live } = result;

      const planName = membership.planName || membership.plan?.name || "";
      const planPrice =
        membership.planPrice > 0 ? membership.planPrice : membership.plan?.price ?? 0;
      const durationDays =
        membership.durationDays > 0
          ? membership.durationDays
          : membership.plan?.durationDays ?? 0;

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
        renewalHistory: renewals.map((r: { id: string; planName: string | null; planPrice: number; durationDays: number; totalPaid: number; paymentMethod: string | null; reviewedAt: Date | null; submittedAt: Date }) => ({
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
  };

  // GET /api/user/memberships — all live enrolled gyms (switcher)
  public getMemberships = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const activeGymId = await ResolveActiveGymService(req.userId!);
      const enrolled = await ListEnrolledMembershipsService(req.userId!);
      sendSuccess(
        res,
        {
          activeGymId,
          memberships: enrolled.map((m) => ShapeEnrolledMembershipService(m, activeGymId)),
        },
        "Enrolled gyms",
      );
    } catch (error) {
      console.error("Get memberships error:", error);
      sendError(res, "Failed to fetch enrolled gyms", 500);
    }
  };

  // PATCH /api/user/active-gym — switch selected gym session
  public switchActiveGym = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const gymId = String(req.body?.gymId || "").trim();
      if (!gymId) {
        sendError(res, "gymId is required");
        return;
      }

      const result = await SetActiveGymService(req.userId!, gymId);
      if (!result.ok) {
        sendError(res, result.message, result.status);
        return;
      }

      sendSuccess(res, { gymId: result.gymId }, "Active gym updated");
    } catch (error) {
      console.error("Switch active gym error:", error);
      sendError(res, "Failed to switch gym", 500);
    }
  };

  // DELETE /api/user/membership — leave currently selected gym only
  public leaveMembership = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const result = await LeaveMembershipService(req.userId!);

      if (!result.ok) {
        sendError(res, "No active membership to leave", 404);
        return;
      }

      sendSuccess(res, null, "Left the gym successfully");
    } catch (error) {
      console.error("Leave membership error:", error);
      sendError(res, "Failed to leave gym", 500);
    }
  };

  // GET /api/user/messages
  public getMessages = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const conversations = await GetMemberMessagesService(req.userId!);

      sendSuccess(res, conversations);
    } catch (error) {
      console.error("Get user messages error:", error);
      sendError(res, "Failed to fetch messages", 500);
    }
  };

  // POST /api/user/messages
  public sendUserMessage = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { conversationId, text, gymId } = req.body;

      const result = await SendUserMessageService({
        userId: req.userId!,
        conversationId,
        text,
        gymId,
      });

      if (result.kind === "error") {
        sendError(res, result.message, result.status);
        return;
      }

      sendCreated(
        res,
        { message: result.message, conversationId: result.conversationId },
        "Message sent",
      );
    } catch (error) {
      console.error("Send user message error:", error);
      sendError(res, "Failed to send message", 500);
    }
  };

  // POST /api/user/ai-chat
  public aiChat = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { message, history } = req.body;

      if (!message || typeof message !== "string") {
        sendError(res, "Invalid message", 400);
        return;
      }

      const reply = await GenerateAiResponseService(message, {
        userId: req.userId!,
        history,
      });

      sendSuccess(res, { reply });
    } catch (error) {
      console.error("AI chat error:", error);
      sendError(res, "Failed to process message", 500);
    }
  };

  // GET /api/user/walk-in-status
  public getWalkInStatus = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const approvals = await GetWalkInStatusService(req.userId!);

      sendSuccess(res, approvals);
    } catch (error) {
      console.error("Get walk-in status error:", error);
      sendError(res, "Failed to fetch status", 500);
    }
  };

  // POST /api/user/walk-in-done/:id — gymer Done after approval → ACTIVE
  public completeWalkInOnboarding = async (
    req: AuthRequest,
    res: Response,
  ): Promise<void> => {
    try {
      const result = await CompleteWalkInService({
        approvalId: String(req.params.id),
        userId: req.userId!,
      });

      if (result.kind === "not-found") {
        sendError(res, "Not found", 404);
        return;
      }

      if (result.kind === "activate-failed") {
        sendError(res, result.message, result.status);
        return;
      }

      if (result.kind === "already") {
        const { approval, membership } = result;

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

      const { approval, shaped, membership } = result;

      sendSuccess(
        res,
        {
          approval: shaped,
          membership: {
            gymId: membership.gymId,
            gymName: shaped.gymName,
            planId: membership.planId,
            planName:
              membership.planName ||
              shaped.planName ||
              "",
            planPrice:
              membership.planPrice ||
              shaped.planPrice ||
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
  };

  // GET /api/user/exercises — member-only for the gymer's selected gym
  public getMemberExercises = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const gymId = await ResolveActiveGymService(req.userId!);
      if (!gymId) {
        sendError(res, "Active membership required", 403);
        return;
      }

      const exercises = await ListMemberExercisesService(gymId);

      sendSuccess(res, exercises);
    } catch (error) {
      console.error("Get member exercises error:", error);
      sendError(res, "Failed to fetch exercises", 500);
    }
  };

  // GET /api/user/equipment — member-only for the gymer's selected gym
  public getMemberEquipment = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const gymId = await ResolveActiveGymService(req.userId!);
      if (!gymId) {
        sendError(res, "Active membership required", 403);
        return;
      }

      const equipment = await ListMemberEquipmentService(gymId);

      sendSuccess(res, equipment);
    } catch (error) {
      console.error("Get member equipment error:", error);
      sendError(res, "Failed to fetch equipment", 500);
    }
  };

  // GET /api/user/shop — member-only products for the gymer's selected gym
  public getMemberShop = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const gymId = await ResolveActiveGymService(req.userId!);
      if (!gymId) {
        sendError(res, "Active membership required", 403);
        return;
      }

      const products = await ListMemberShopService(gymId);

      sendSuccess(res, products);
    } catch (error) {
      console.error("Get member shop error:", error);
      sendError(res, "Failed to fetch shop products", 500);
    }
  };
}

export default new UserController();

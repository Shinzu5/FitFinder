import { Response } from "express";
import { sendSuccess, sendError, sendCreated } from "@/utils/apiResponse";
import { AuthRequest } from "@/types/common";
import {
  ApproveWalkInService,
  CloseDailySalesService,
  CompleteWalkInPaymentService,
  DeclineWalkInService,
  DeletePaymentService,
  GetClerkDashboardService,
  GetClosingPreviewService,
  ListClerkApprovalsService,
  ListClerkPlansService,
  ListOpenTransactionsService,
  ListWalkInPaymentsService,
  RecordPaymentService,
  RegisterMemberService,
  UpdatePaymentService,
  toFrontendTxnType,
} from "@/services/clerk";
import { ListGymMembersService } from "@/services/membership";
import { GetStaffGymService } from "@/services/gym";

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

export class ClerkController {
  // GET /api/clerk/dashboard
  public getDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const gym = await GetStaffGymService(req.userId!);
      if (!gym) { sendError(res, "Not assigned to any gym", 404); return; }

      const dashboard = await GetClerkDashboardService(gym.id);

      sendSuccess(res, {
        gymName: gym.name,
        walkInsToday: dashboard.todayCount,
        revenueToday: dashboard.revenueToday,
        monthlyRevenue: dashboard.monthlyRevenue,
        revenueByMonth: dashboard.revenueByMonth,
        newMembersToday: dashboard.newMembersToday,
        activeNow: dashboard.activeNow,
      });
    } catch (error) {
      console.error("Clerk dashboard error:", error);
      sendError(res, "Failed to fetch dashboard", 500);
    }
  };

  // GET /api/clerk/transactions
  public getTransactions = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const gym = await GetStaffGymService(req.userId!);
      if (!gym) { sendError(res, "Not assigned to any gym", 404); return; }

      // Running counter: only open (not yet included in a daily closing) transactions
      const transactions = await ListOpenTransactionsService(gym.id);

      sendSuccess(res, transactions.map(shapeClerkTransaction));
    } catch (error) {
      console.error("Get transactions error:", error);
      sendError(res, "Failed to fetch transactions", 500);
    }
  };

  // POST /api/clerk/transactions
  public recordPayment = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const gym = await GetStaffGymService(req.userId!);
      if (!gym) { sendError(res, "Not assigned to any gym", 404); return; }

      const result = await RecordPaymentService({
        gymId: gym.id,
        clerkId: req.userId!,
        body: req.body,
      });

      if (result.kind === "error") {
        sendError(res, result.message, result.status);
        return;
      }

      sendCreated(res, shapeClerkTransaction(result.txn), "Payment recorded");
    } catch (error) {
      console.error("Record payment error:", error);
      sendError(res, "Failed to record payment", 500);
    }
  };

  // PUT /api/clerk/transactions/:id — edit an open (not-yet-closed) Today's Log payment
  public updatePayment = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const gym = await GetStaffGymService(req.userId!);
      if (!gym) { sendError(res, "Not assigned to any gym", 404); return; }

      const result = await UpdatePaymentService({
        gymId: gym.id,
        paymentId: String(req.params.id),
        body: req.body,
      });

      if (result.kind === "error") {
        sendError(res, result.message, result.status);
        return;
      }

      sendSuccess(res, shapeClerkTransaction(result.txn), "Payment updated");
    } catch (error) {
      console.error("Update payment error:", error);
      sendError(res, "Failed to update payment", 500);
    }
  };

  // DELETE /api/clerk/transactions/:id — remove an open Today's Log payment
  public deletePayment = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const gym = await GetStaffGymService(req.userId!);
      if (!gym) { sendError(res, "Not assigned to any gym", 404); return; }

      const result = await DeletePaymentService({
        gymId: gym.id,
        paymentId: String(req.params.id),
      });

      if (result.kind === "error") {
        sendError(res, result.message, result.status);
        return;
      }

      sendSuccess(res, { id: result.id }, "Payment removed");
    } catch (error) {
      console.error("Delete payment error:", error);
      sendError(res, "Failed to remove payment", 500);
    }
  };

  // GET /api/clerk/members
  public getMembers = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const gym = await GetStaffGymService(req.userId!);
      if (!gym) { sendError(res, "Not assigned to any gym", 404); return; }

      const members = await ListGymMembersService(gym.id);
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
  };

  // POST /api/clerk/members
  public registerMember = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const gym = await GetStaffGymService(req.userId!);
      if (!gym) { sendError(res, "Not assigned to any gym", 404); return; }

      const { firstName, lastName, email, planId } = req.body;

      const result = await RegisterMemberService({
        gymId: gym.id,
        clerkId: req.userId!,
        firstName,
        lastName,
        email,
        planId,
      });

      if (result.kind === "error") {
        sendError(res, result.message, result.status);
        return;
      }

      sendCreated(res, result.membership, "Member registered");
    } catch (error) {
      console.error("Register member error:", error);
      sendError(res, "Failed to register member", 500);
    }
  };

  // GET /api/clerk/plans
  public getPlans = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const gym = await GetStaffGymService(req.userId!);
      if (!gym) { sendError(res, "Not assigned to any gym", 404); return; }

      const plans = await ListClerkPlansService(gym.id);

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
  };

  // GET /api/clerk/approvals
  public getApprovals = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const gym = await GetStaffGymService(req.userId!);
      if (!gym) { sendError(res, "Not assigned to any gym", 404); return; }

      const approvals = await ListClerkApprovalsService(gym.id);

      sendSuccess(
        res,
        approvals.map((a) => {
          const method = String(a.paymentMethod || "WALK_IN").toUpperCase();
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
            isRenewal: Boolean(a.isRenewal),
            paymentMethod: method === "XENDIT" ? "Cashless" : "Walk-in",
            paymentMethodRaw: method,
            paymentStatus: String(a.paymentStatus || "PAID").toLowerCase(),
            approvalStatus: a.status.toLowerCase(),
            status: a.status.toLowerCase(),
            rejectionReason: a.rejectionReason || "",
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
  };

  // PUT /api/clerk/approvals/:id/approve
  // PENDING → APPROVED only. ACTIVE membership waits for gymer Done / clerk complete.
  public approveWalkIn = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const result = await ApproveWalkInService({
        approvalId: String(req.params.id),
        actorId: req.userId!,
      });

      if (result.kind === "not-found") {
        sendError(res, "Not found", 404);
        return;
      }

      if (result.kind === "forbidden") {
        sendError(res, "Not authorized for this gym", 403);
        return;
      }

      if (result.kind === "error") {
        sendError(res, result.message, result.status);
        return;
      }

      sendSuccess(
        res,
        result.shaped,
        result.isRenewal
          ? "Renewal approved — gymer must tap Done to apply days"
          : "Membership approved — gymer must tap Done to activate",
      );
    } catch (error) {
      console.error("Approve walk-in error:", error);
      sendError(res, "Failed to approve", 500);
    }
  };

  // GET /api/clerk/walk-in-payments
  // Approved requests waiting for front-desk cash confirmation (Done).
  public getWalkInPayments = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const gym = await GetStaffGymService(req.userId!);
      if (!gym) { sendError(res, "Not assigned to any gym", 404); return; }

      const approvals = await ListWalkInPaymentsService(gym.id);

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
  };

  // POST /api/clerk/walk-in-payments/:id/complete
  // Staff Done: APPROVED → ACTIVE (same shared activation for gymer Done).
  public completeWalkInPayment = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const result = await CompleteWalkInPaymentService({
        approvalId: String(req.params.id),
        actorId: req.userId!,
      });

      if (result.kind === "not-found") {
        sendError(res, "Not found", 404);
        return;
      }

      if (result.kind === "forbidden") {
        sendError(res, "Not authorized for this gym", 403);
        return;
      }

      if (result.kind === "error") {
        sendError(res, result.message, result.status);
        return;
      }

      sendSuccess(
        res,
        {
          approval: result.shaped,
          membership: {
            gymId: result.membership.gymId,
            planId: result.membership.planId,
            paymentRef: result.membership.paymentRef,
            totalPaid: result.membership.totalPaid,
            joinedAt: result.membership.joinedAt.toISOString(),
            expiresAt: result.membership.expiresAt.toISOString(),
            durationDays: result.membership.durationDays,
          },
        },
        result.isRenewal
          ? "Renewal activated — membership days extended"
          : "Walk-in completed — membership is now Active.",
      );
    } catch (error) {
      console.error("Complete walk-in payment error:", error);
      sendError(res, "Failed to complete walk-in payment", 500);
    }
  };

  // PUT /api/clerk/approvals/:id/decline
  public declineWalkIn = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const result = await DeclineWalkInService({
        approvalId: String(req.params.id),
        actorId: req.userId!,
        reason: req.body?.reason || req.body?.rejectionReason,
      });

      if (result.kind === "not-found") {
        sendError(res, "Not found", 404);
        return;
      }

      if (result.kind === "already-processed") {
        sendError(res, "Already processed");
        return;
      }

      if (result.kind === "forbidden") {
        sendError(res, "Not authorized for this gym", 403);
        return;
      }

      sendSuccess(res, result.payload, "Walk-in declined");
    } catch (error) {
      console.error("Decline walk-in error:", error);
      sendError(res, "Failed to decline", 500);
    }
  };

  // GET /api/clerk/sales/closing-preview
  public getClosingPreview = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const gym = await GetStaffGymService(req.userId!);
      if (!gym) { sendError(res, "Not assigned to any gym", 404); return; }

      const preview = await GetClosingPreviewService(gym.id);

      sendSuccess(res, {
        gymId: preview.gymId,
        gymName: gym.name,
        date: preview.date,
        totalTransactions: preview.totalTransactions,
        totalRevenue: preview.totalRevenue,
        canClose: preview.canClose,
        message: preview.message,
      });
    } catch (error) {
      console.error("Closing preview error:", error);
      sendError(res, "Failed to load closing preview", 500);
    }
  };

  // POST /api/clerk/sales/close
  public closeDailySales = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const gym = await GetStaffGymService(req.userId!);
      if (!gym) { sendError(res, "Not assigned to any gym", 404); return; }

      const result = await CloseDailySalesService({
        gymId: gym.id,
        clerkId: req.userId!,
      });

      if (result.kind === "empty") {
        sendError(
          res,
          "Cannot close sales: no new transactions since the last closing.",
          400,
        );
        return;
      }

      const { report, openTxns, closedByRole, actorFullName } = result;

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
          closedByName: report.clerk.fullName || actorFullName || "",
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
  };
}

export default new ClerkController();

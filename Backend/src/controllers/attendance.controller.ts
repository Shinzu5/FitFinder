import { Response } from "express";
import { sendSuccess, sendError, sendCreated } from "@/utils/apiResponse";
import { AuthRequest } from "@/types/common";
import {
  CheckInMemberService,
  CheckInWalkInService,
  CheckOutAttendanceService,
  GetAttendanceOverviewService,
} from "@/services/attendance";
import { GetStaffGymService } from "@/services/gym";

export class AttendanceController {
  // GET /api/clerk/attendance
  public getAttendance = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const gym = await GetStaffGymService(req.userId!);
      if (!gym) {
        sendError(res, "Not assigned to any gym", 404);
        return;
      }

      const { open, today, activeNow, memberships } = await GetAttendanceOverviewService(
        gym.id,
      );

      // One row per user (latest membership)
      const byUser = new Map<string, (typeof memberships)[number]>();
      for (const m of memberships) {
        if (!byUser.has(m.userId)) byUser.set(m.userId, m);
      }

      sendSuccess(res, {
        gymId: gym.id,
        gymName: gym.name,
        activeNow,
        open,
        today,
        members: [...byUser.values()].map((m) => {
          const openRow = open.find((a) => a.userId === m.userId);
          return {
            id: m.userId,
            membershipId: m.id,
            firstName: m.user.fullName.trim().split(/\s+/)[0] || "",
            lastName: m.user.fullName.trim().split(/\s+/).slice(1).join(" "),
            fullName: m.user.fullName,
            email: m.user.email,
            plan: m.planName || m.plan?.name || "Plan",
            status: "active",
            checkedIn: Boolean(openRow),
            openAttendanceId: openRow?.id ?? null,
          };
        }),
      });
    } catch (error) {
      console.error("Get attendance error:", error);
      sendError(res, "Failed to fetch attendance", 500);
    }
  };

  // POST /api/clerk/attendance/check-in
  public postMemberCheckIn = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const gym = await GetStaffGymService(req.userId!);
      if (!gym) {
        sendError(res, "Not assigned to any gym", 404);
        return;
      }

      const userId = String(req.body.userId || "").trim();
      if (!userId) {
        sendError(res, "userId is required");
        return;
      }

      const result = await CheckInMemberService({
        gymId: gym.id,
        userId,
        actorId: req.userId!,
      });
      if (!result.ok) {
        sendError(res, result.message, result.status);
        return;
      }

      sendCreated(res, result, "Checked in");
    } catch (error) {
      console.error("Check-in error:", error);
      sendError(res, "Failed to check in", 500);
    }
  };

  // POST /api/clerk/attendance/walk-in
  public postWalkInCheckIn = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const gym = await GetStaffGymService(req.userId!);
      if (!gym) {
        sendError(res, "Not assigned to any gym", 404);
        return;
      }

      const result = await CheckInWalkInService({
        gymId: gym.id,
        name: String(req.body.name || ""),
        paymentAmount: Number(req.body.paymentAmount ?? req.body.price ?? 0),
        actorId: req.userId!,
      });
      if (!result.ok) {
        sendError(res, result.message, result.status);
        return;
      }

      sendCreated(res, result, "Walk-in checked in");
    } catch (error) {
      console.error("Walk-in check-in error:", error);
      sendError(res, "Failed to record walk-in attendance", 500);
    }
  };

  // POST /api/clerk/attendance/:id/check-out
  public postCheckOut = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const gym = await GetStaffGymService(req.userId!);
      if (!gym) {
        sendError(res, "Not assigned to any gym", 404);
        return;
      }

      const result = await CheckOutAttendanceService({
        gymId: gym.id,
        attendanceId: String(req.params.id),
      });
      if (!result.ok) {
        sendError(res, result.message, result.status);
        return;
      }

      sendSuccess(res, result, "Checked out");
    } catch (error) {
      console.error("Check-out error:", error);
      sendError(res, "Failed to check out", 500);
    }
  };
}

export default new AttendanceController();

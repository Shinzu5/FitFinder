import { Response } from "express";
import { sendSuccess, sendError, sendCreated } from "../utils/apiResponse";
import { AuthRequest } from "../middleware/auth";
import prisma from "../config/database";
import {
  checkInMember,
  checkInWalkIn,
  checkOutAttendance,
  countActiveNow,
  listOpenAttendances,
  listTodayAttendances,
} from "../services/attendance.service";

async function getStaffGym(userId: string) {
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

// GET /api/clerk/attendance
export async function getAttendance(req: AuthRequest, res: Response): Promise<void> {
  try {
    const gym = await getStaffGym(req.userId!);
    if (!gym) {
      sendError(res, "Not assigned to any gym", 404);
      return;
    }

    const now = new Date();
    const [open, today, activeNow, memberships] = await Promise.all([
      listOpenAttendances(gym.id),
      listTodayAttendances(gym.id),
      countActiveNow(gym.id),
      prisma.gymMembership.findMany({
        where: {
          gymId: gym.id,
          status: { in: ["ACTIVE", "EXPIRING"] },
          expiresAt: { gt: now },
        },
        include: {
          user: { select: { id: true, fullName: true, email: true } },
          plan: { select: { name: true } },
        },
        orderBy: { joinedAt: "desc" },
      }),
    ]);

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
}

// POST /api/clerk/attendance/check-in
export async function postMemberCheckIn(req: AuthRequest, res: Response): Promise<void> {
  try {
    const gym = await getStaffGym(req.userId!);
    if (!gym) {
      sendError(res, "Not assigned to any gym", 404);
      return;
    }

    const userId = String(req.body.userId || "").trim();
    if (!userId) {
      sendError(res, "userId is required");
      return;
    }

    const result = await checkInMember({
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
}

// POST /api/clerk/attendance/walk-in
export async function postWalkInCheckIn(req: AuthRequest, res: Response): Promise<void> {
  try {
    const gym = await getStaffGym(req.userId!);
    if (!gym) {
      sendError(res, "Not assigned to any gym", 404);
      return;
    }

    const result = await checkInWalkIn({
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
}

// POST /api/clerk/attendance/:id/check-out
export async function postCheckOut(req: AuthRequest, res: Response): Promise<void> {
  try {
    const gym = await getStaffGym(req.userId!);
    if (!gym) {
      sendError(res, "Not assigned to any gym", 404);
      return;
    }

    const result = await checkOutAttendance({
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
}

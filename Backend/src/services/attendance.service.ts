import prisma from "../config/database";
import { emitAttendanceUpdated, emitSalesUpdated } from "./realtime.service";

export function shapeAttendance(row: {
  id: string;
  gymId: string;
  userId: string | null;
  memberName: string;
  type: string;
  paymentAmount: number;
  checkedInAt: Date;
  checkedOutAt: Date | null;
  checkedInById: string | null;
}) {
  return {
    id: row.id,
    gymId: row.gymId,
    userId: row.userId,
    memberName: row.memberName,
    type: row.type,
    paymentAmount: row.paymentAmount,
    checkedInAt: row.checkedInAt.toISOString(),
    checkedOutAt: row.checkedOutAt ? row.checkedOutAt.toISOString() : null,
    checkedInById: row.checkedInById,
    isCheckedIn: !row.checkedOutAt,
  };
}

/**
 * Mirror attendance check-in into Walk-in Payments → Today's Log (ClerkTransaction).
 * Idempotent via notes marker `Attendance {id}` — no schema change, no duplicates.
 */
async function ensureAttendancePaymentLog(opts: {
  gymId: string;
  actorId: string;
  attendanceId: string;
  memberName: string;
  kind: "MEMBER" | "WALK_IN";
  amount: number;
  checkedInAt: Date;
}): Promise<boolean> {
  const marker = `Attendance ${opts.attendanceId}`;
  const existing = await prisma.clerkTransaction.findFirst({
    where: { gymId: opts.gymId, notes: { contains: marker } },
    select: { id: true },
  });
  if (existing) return false;

  const amount = Math.max(0, Number(opts.amount) || 0);
  const kindLabel = opts.kind === "MEMBER" ? "Member" : "Walk-in";
  const checkInTime = opts.checkedInAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  // Today's Log title = notes; encode Member/Walk-in, time, status for existing UI
  const notes = `${kindLabel} check-in · ${checkInTime} · Checked in · ${marker}`;

  await prisma.clerkTransaction.create({
    data: {
      gymId: opts.gymId,
      clerkId: opts.actorId,
      type: opts.kind === "MEMBER" ? "SESSION" : "DAY_PASS",
      memberName: opts.memberName,
      amount,
      method: "CASH",
      notes,
    },
  });
  return true;
}

export async function countActiveNow(gymId: string): Promise<number> {
  return prisma.attendance.count({
    where: { gymId, checkedOutAt: null },
  });
}

export async function listOpenAttendances(gymId: string) {
  const rows = await prisma.attendance.findMany({
    where: { gymId, checkedOutAt: null },
    orderBy: { checkedInAt: "desc" },
  });
  return rows.map(shapeAttendance);
}

export async function listTodayAttendances(gymId: string) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const rows = await prisma.attendance.findMany({
    where: { gymId, checkedInAt: { gte: startOfDay } },
    orderBy: { checkedInAt: "desc" },
  });
  return rows.map(shapeAttendance);
}

/** Check in a registered member — blocks if already checked in without checkout. */
export async function checkInMember(opts: {
  gymId: string;
  userId: string;
  actorId: string;
}) {
  const membership = await prisma.gymMembership.findFirst({
    where: {
      gymId: opts.gymId,
      userId: opts.userId,
      status: { in: ["ACTIVE", "EXPIRING"] },
      expiresAt: { gt: new Date() },
    },
    include: { user: { select: { fullName: true } } },
  });
  if (!membership) {
    return { ok: false as const, status: 404, message: "Active membership not found" };
  }

  const open = await prisma.attendance.findFirst({
    where: {
      gymId: opts.gymId,
      userId: opts.userId,
      checkedOutAt: null,
    },
  });
  if (open) {
    return {
      ok: false as const,
      status: 409,
      message: "Member is already checked in. Check out first.",
    };
  }

  const row = await prisma.attendance.create({
    data: {
      gymId: opts.gymId,
      userId: opts.userId,
      memberName: membership.user.fullName,
      type: "MEMBER",
      paymentAmount: 0,
      checkedInById: opts.actorId,
    },
  });

  const createdPayment = await ensureAttendancePaymentLog({
    gymId: opts.gymId,
    actorId: opts.actorId,
    attendanceId: row.id,
    memberName: membership.user.fullName,
    kind: "MEMBER",
    amount: 0,
    checkedInAt: row.checkedInAt,
  });

  const activeNow = await countActiveNow(opts.gymId);
  void emitAttendanceUpdated(opts.gymId, { activeNow });
  if (createdPayment) void emitSalesUpdated(opts.gymId);
  return { ok: true as const, attendance: shapeAttendance(row), activeNow };
}

/** Record a walk-in visitor (no account) and check them in. */
export async function checkInWalkIn(opts: {
  gymId: string;
  name: string;
  paymentAmount: number;
  actorId: string;
}) {
  const name = opts.name.trim();
  if (!name) {
    return { ok: false as const, status: 400, message: "Name is required" };
  }
  const amount = Number(opts.paymentAmount);
  if (!Number.isFinite(amount) || amount < 0) {
    return { ok: false as const, status: 400, message: "Payment/Price is required" };
  }

  const row = await prisma.attendance.create({
    data: {
      gymId: opts.gymId,
      userId: null,
      memberName: name,
      type: "WALK_IN",
      paymentAmount: amount,
      checkedInById: opts.actorId,
    },
  });

  const createdPayment = await ensureAttendancePaymentLog({
    gymId: opts.gymId,
    actorId: opts.actorId,
    attendanceId: row.id,
    memberName: name,
    kind: "WALK_IN",
    amount,
    checkedInAt: row.checkedInAt,
  });

  const activeNow = await countActiveNow(opts.gymId);
  void emitAttendanceUpdated(opts.gymId, { activeNow });
  if (createdPayment) void emitSalesUpdated(opts.gymId);
  return { ok: true as const, attendance: shapeAttendance(row), activeNow };
}

export async function checkOutAttendance(opts: {
  gymId: string;
  attendanceId: string;
}) {
  const existing = await prisma.attendance.findFirst({
    where: {
      id: opts.attendanceId,
      gymId: opts.gymId,
      checkedOutAt: null,
    },
  });
  if (!existing) {
    return { ok: false as const, status: 404, message: "Open attendance not found" };
  }

  const row = await prisma.attendance.update({
    where: { id: existing.id },
    data: { checkedOutAt: new Date() },
  });

  const activeNow = await countActiveNow(opts.gymId);
  void emitAttendanceUpdated(opts.gymId, { activeNow });
  return { ok: true as const, attendance: shapeAttendance(row), activeNow };
}

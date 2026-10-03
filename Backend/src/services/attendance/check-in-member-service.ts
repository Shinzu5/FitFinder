import { MembershipRepository } from "@/repositories/membership.repository";
import { AttendanceRepository } from "@/repositories/attendance.repository";
import { EmitAttendanceUpdatedService as emitAttendanceUpdated } from "@/services/realtime/emit-attendance-updated-service";
import { EmitSalesUpdatedService as emitSalesUpdated } from "@/services/realtime/emit-sales-updated-service";
import { ShapeAttendanceService as shapeAttendance } from "@/services/attendance/shape-attendance-service";
import { EnsureAttendancePaymentLogService as ensureAttendancePaymentLog } from "@/services/attendance/ensure-attendance-payment-log-service";
import { CountActiveNowService as countActiveNow } from "@/services/attendance/count-active-now-service";

const membershipRepository = new MembershipRepository();
const attendanceRepository = new AttendanceRepository();

/** Check in a registered member — blocks if already checked in without checkout. */
export async function CheckInMemberService(opts: {
  gymId: string;
  userId: string;
  actorId: string;
}) {
  const membership = await membershipRepository.findLiveForCheckIn(
    opts.gymId,
    opts.userId,
  );
  if (!membership) {
    return { ok: false as const, status: 404, message: "Active membership not found" };
  }

  const open = await attendanceRepository.findOpenForUser(
    opts.gymId,
    opts.userId,
  );
  if (open) {
    return {
      ok: false as const,
      status: 409,
      message: "Member is already checked in. Check out first.",
    };
  }

  const row = await attendanceRepository.createCheckIn({
    gymId: opts.gymId,
    userId: opts.userId,
    memberName: membership.user.fullName,
    type: "MEMBER",
    paymentAmount: 0,
    checkedInById: opts.actorId,
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

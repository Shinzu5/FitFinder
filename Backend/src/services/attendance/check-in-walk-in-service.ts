import { AttendanceRepository } from "@/repositories/attendance.repository";
import { EmitAttendanceUpdatedService as emitAttendanceUpdated } from "@/services/realtime/emit-attendance-updated-service";
import { EmitSalesUpdatedService as emitSalesUpdated } from "@/services/realtime/emit-sales-updated-service";
import { ShapeAttendanceService as shapeAttendance } from "@/services/attendance/shape-attendance-service";
import { EnsureAttendancePaymentLogService as ensureAttendancePaymentLog } from "@/services/attendance/ensure-attendance-payment-log-service";
import { CountActiveNowService as countActiveNow } from "@/services/attendance/count-active-now-service";

const attendanceRepository = new AttendanceRepository();

/** Record a walk-in visitor (no account) and check them in. */
export async function CheckInWalkInService(opts: {
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

  const row = await attendanceRepository.createCheckIn({
    gymId: opts.gymId,
    userId: null,
    memberName: name,
    type: "WALK_IN",
    paymentAmount: amount,
    checkedInById: opts.actorId,
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

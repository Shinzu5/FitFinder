import { AttendanceRepository } from "@/repositories/attendance.repository";
import { EmitAttendanceUpdatedService as emitAttendanceUpdated } from "@/services/realtime/emit-attendance-updated-service";
import { ShapeAttendanceService as shapeAttendance } from "@/services/attendance/shape-attendance-service";
import { CountActiveNowService as countActiveNow } from "@/services/attendance/count-active-now-service";

const attendanceRepository = new AttendanceRepository();

export async function CheckOutAttendanceService(opts: {
  gymId: string;
  attendanceId: string;
}) {
  const existing = await attendanceRepository.findOpenByIdAndGym(
    opts.attendanceId,
    opts.gymId,
  );
  if (!existing) {
    return { ok: false as const, status: 404, message: "Open attendance not found" };
  }

  const row = await attendanceRepository.markCheckedOut(
    existing.id,
    new Date(),
  );

  const activeNow = await countActiveNow(opts.gymId);
  void emitAttendanceUpdated(opts.gymId, { activeNow });
  return { ok: true as const, attendance: shapeAttendance(row), activeNow };
}

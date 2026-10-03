import { AttendanceRepository } from "@/repositories/attendance.repository";
import { ShapeAttendanceService as shapeAttendance } from "@/services/attendance/shape-attendance-service";

const attendanceRepository = new AttendanceRepository();

export async function ListOpenAttendancesService(gymId: string) {
  const rows = await attendanceRepository.listOpen(gymId);
  return rows.map(shapeAttendance);
}

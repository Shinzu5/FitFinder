import { AttendanceRepository } from "@/repositories/attendance.repository";
import { ShapeAttendanceService as shapeAttendance } from "@/services/attendance/shape-attendance-service";

const attendanceRepository = new AttendanceRepository();

export async function ListTodayAttendancesService(gymId: string) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const rows = await attendanceRepository.listToday(gymId, startOfDay);
  return rows.map(shapeAttendance);
}

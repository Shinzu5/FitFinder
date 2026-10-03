import { AttendanceRepository } from "@/repositories/attendance.repository";

const attendanceRepository = new AttendanceRepository();

export async function CountActiveNowService(gymId: string): Promise<number> {
  return attendanceRepository.countActiveNow(gymId);
}

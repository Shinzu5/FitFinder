import { Prisma } from "@prisma/client";
import prisma from "@/config/database";

/**
 * Attendance check-in / check-out, active-now counting and open/today lists.
 * 1:1 with attendance.service.ts and attendance/gym controllers.
 */
export class AttendanceRepository {
  // ─── Generic passthroughs ───────────────────────────────────────────────────

  async findAttendances(args: Prisma.AttendanceFindManyArgs) {
    return prisma.attendance.findMany(args);
  }

  async findAttendance(args: Prisma.AttendanceFindFirstArgs) {
    return prisma.attendance.findFirst(args);
  }

  async countAttendances(args: Prisma.AttendanceCountArgs = {}) {
    return prisma.attendance.count(args);
  }

  async createAttendance(args: Prisma.AttendanceCreateArgs) {
    return prisma.attendance.create(args);
  }

  async updateAttendance(args: Prisma.AttendanceUpdateArgs) {
    return prisma.attendance.update(args);
  }

  // ─── Named queries ──────────────────────────────────────────────────────────

  /** People currently inside the gym (checked in, not checked out). */
  async countActiveNow(gymId: string) {
    return prisma.attendance.count({ where: { gymId, checkedOutAt: null } });
  }

  /** Open check-ins, newest first. */
  async listOpen(gymId: string) {
    return prisma.attendance.findMany({
      where: { gymId, checkedOutAt: null },
      orderBy: { checkedInAt: "desc" },
    });
  }

  /** Today's check-ins (from startOfDay), newest first. */
  async listToday(gymId: string, startOfDay: Date) {
    return prisma.attendance.findMany({
      where: { gymId, checkedInAt: { gte: startOfDay } },
      orderBy: { checkedInAt: "desc" },
    });
  }

  /** Open attendance for one member (blocks double check-in). */
  async findOpenForUser(gymId: string, userId: string) {
    return prisma.attendance.findFirst({
      where: { gymId, userId, checkedOutAt: null },
    });
  }

  /** Open attendance by id, scoped to a gym (check-out guard). */
  async findOpenByIdAndGym(id: string, gymId: string) {
    return prisma.attendance.findFirst({ where: { id, gymId, checkedOutAt: null } });
  }

  async createCheckIn(data: Prisma.AttendanceCreateArgs["data"]) {
    return prisma.attendance.create({ data });
  }

  async markCheckedOut(id: string, checkedOutAt: Date) {
    return prisma.attendance.update({
      where: { id },
      data: { checkedOutAt },
    });
  }

  /** Active-now counts grouped by gym (public gym list). */
  async countOpenByGymIds(gymIds: string[]) {
    return prisma.attendance.groupBy({
      by: ["gymId"],
      where: { gymId: { in: gymIds }, checkedOutAt: null },
      _count: { _all: true },
    });
  }
}

import { Prisma } from "@prisma/client";
import prisma from "../config/database";

export type Tx = typeof prisma | Prisma.TransactionClient;

/**
 * Attendance check-in / check-out, active-now counting and open/today lists.
 * 1:1 with attendance.service.ts and attendance/gym controllers.
 */
export class AttendanceRepository {
  // ─── Generic passthroughs ───────────────────────────────────────────────────

  async findAttendances(args: Prisma.AttendanceFindManyArgs, tx: Tx = prisma) {
    return tx.attendance.findMany(args);
  }

  async findAttendance(args: Prisma.AttendanceFindFirstArgs, tx: Tx = prisma) {
    return tx.attendance.findFirst(args);
  }

  async countAttendances(args: Prisma.AttendanceCountArgs = {}, tx: Tx = prisma) {
    return tx.attendance.count(args);
  }

  async createAttendance(args: Prisma.AttendanceCreateArgs, tx: Tx = prisma) {
    return tx.attendance.create(args);
  }

  async updateAttendance(args: Prisma.AttendanceUpdateArgs, tx: Tx = prisma) {
    return tx.attendance.update(args);
  }

  // ─── Named queries ──────────────────────────────────────────────────────────

  /** People currently inside the gym (checked in, not checked out). */
  async countActiveNow(gymId: string, tx: Tx = prisma) {
    return tx.attendance.count({ where: { gymId, checkedOutAt: null } });
  }

  /** Open check-ins, newest first. */
  async listOpen(gymId: string, tx: Tx = prisma) {
    return tx.attendance.findMany({
      where: { gymId, checkedOutAt: null },
      orderBy: { checkedInAt: "desc" },
    });
  }

  /** Today's check-ins (from startOfDay), newest first. */
  async listToday(gymId: string, startOfDay: Date, tx: Tx = prisma) {
    return tx.attendance.findMany({
      where: { gymId, checkedInAt: { gte: startOfDay } },
      orderBy: { checkedInAt: "desc" },
    });
  }

  /** Open attendance for one member (blocks double check-in). */
  async findOpenForUser(gymId: string, userId: string, tx: Tx = prisma) {
    return tx.attendance.findFirst({
      where: { gymId, userId, checkedOutAt: null },
    });
  }

  /** Open attendance by id, scoped to a gym (check-out guard). */
  async findOpenByIdAndGym(id: string, gymId: string, tx: Tx = prisma) {
    return tx.attendance.findFirst({ where: { id, gymId, checkedOutAt: null } });
  }

  async createCheckIn(data: Prisma.AttendanceCreateArgs["data"], tx: Tx = prisma) {
    return tx.attendance.create({ data });
  }

  async markCheckedOut(id: string, checkedOutAt: Date, tx: Tx = prisma) {
    return tx.attendance.update({
      where: { id },
      data: { checkedOutAt },
    });
  }

  /** Active-now counts grouped by gym (public gym list). */
  async countOpenByGymIds(gymIds: string[], tx: Tx = prisma) {
    return tx.attendance.groupBy({
      by: ["gymId"],
      where: { gymId: { in: gymIds }, checkedOutAt: null },
      _count: { _all: true },
    });
  }
}

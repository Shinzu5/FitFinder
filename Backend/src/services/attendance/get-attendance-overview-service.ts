import { MembershipRepository } from "@/repositories/membership.repository";
import { CountActiveNowService as countActiveNow } from "@/services/attendance/count-active-now-service";
import { ListOpenAttendancesService as listOpenAttendances } from "@/services/attendance/list-open-attendances-service";
import { ListTodayAttendancesService as listTodayAttendances } from "@/services/attendance/list-today-attendances-service";

const membershipRepository = new MembershipRepository();

/**
 * GET /api/clerk/attendance — open + today rows, live count and the live
 * memberships the page renders (fetched in one fan-out).
 */
export async function GetAttendanceOverviewService(gymId: string) {
  const now = new Date();

  const [open, today, activeNow, memberships] = await Promise.all([
    listOpenAttendances(gymId),
    listTodayAttendances(gymId),
    countActiveNow(gymId),
    membershipRepository.listLiveByGym(gymId, now),
  ]);

  return { open, today, activeNow, memberships };
}

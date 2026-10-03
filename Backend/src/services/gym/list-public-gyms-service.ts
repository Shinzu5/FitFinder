import { GymRepository } from "@/repositories/gym.repository";
import { AttendanceRepository } from "@/repositories/attendance.repository";

const gymRepository = new GymRepository();
const attendanceRepository = new AttendanceRepository();

/**
 * GET /api/gyms — public catalog with live check-in counts.
 * Auto-publishes any legacy PENDING gyms (admin approval removed) first.
 */
export async function ListPublicGymsService(search?: unknown) {
  await gymRepository.publishPendingGyms();

  const where: any = { status: "ACTIVE" };
  if (search && typeof search === "string") {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { address: { contains: search, mode: "insensitive" } },
    ];
  }

  const gyms = await gymRepository.listPublicCatalog(where);

  const gymIds = gyms.map((g) => g.id);
  const activeGroups =
    gymIds.length > 0 ? await attendanceRepository.countOpenByGymIds(gymIds) : [];
  const activeNowByGym = new Map(
    activeGroups.map((g) => [g.gymId, g._count._all]),
  );

  return { gyms, activeNowByGym };
}

import { MembershipRepository } from "@/repositories/membership.repository";
import { ListLiveMembershipsService } from "@/services/gym/list-live-memberships-service";

const membershipRepository = new MembershipRepository();

/** Live + expired memberships (for Enrolled Gyms switcher). */
export async function ListEnrolledMembershipsService(userId: string) {
  const live = await ListLiveMembershipsService(userId);
  const liveGymIds = new Set(live.map((m) => m.gymId));
  const expired = await membershipRepository.listNonLiveByUser(userId, [...liveGymIds]);

  const seen = new Set<string>();
  const expiredUnique: typeof expired = [];
  for (const m of expired) {
    if (seen.has(m.gymId)) continue;
    seen.add(m.gymId);
    expiredUnique.push(m);
  }

  return [...live, ...expiredUnique];
}

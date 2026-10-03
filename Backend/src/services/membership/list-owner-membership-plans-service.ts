import { MembershipRepository } from "@/repositories/membership.repository";

const membershipRepository = new MembershipRepository();

/** GET /api/owner/membership-plans — active plans with subscriber counts. */
export async function ListOwnerMembershipPlansService(gymId: string) {
  return membershipRepository.listActiveWithCountsByGym(gymId);
}

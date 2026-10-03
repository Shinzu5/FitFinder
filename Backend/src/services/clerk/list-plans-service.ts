import { MembershipRepository } from "@/repositories/membership.repository";

const membershipRepository = new MembershipRepository();

/** GET /api/clerk/plans — active plans for the clerk's gym, cheapest first. */
export async function ListClerkPlansService(gymId: string) {
  return membershipRepository.listActiveByGym(gymId);
}

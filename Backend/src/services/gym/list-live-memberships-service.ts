import { MembershipRepository } from "@/repositories/membership.repository";
import { ExpireOverdueMembershipsService as expireOverdueMemberships } from "@/services/membership/expire-overdue-memberships-service";

const membershipRepository = new MembershipRepository();

/** Live memberships for a user (ACTIVE/EXPIRING and not past expiresAt). */
export async function ListLiveMembershipsService(userId: string) {
  await expireOverdueMemberships(userId);
  return membershipRepository.listLiveByUser(userId);
}

import { MembershipRepository } from "@/repositories/membership.repository";
import { ShapeGymMemberService as shapeGymMember } from "@/services/membership/shape-gym-member-service";

const membershipRepository = new MembershipRepository();

export async function ListGymMembersService(gymId: string) {
  await membershipRepository.expireOverdueByGym(gymId);

  const memberships = await membershipRepository.listByGymWithMember(gymId);

  return memberships.map(shapeGymMember);
}

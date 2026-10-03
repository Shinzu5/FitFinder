import { ApprovalRepository } from "@/repositories/approval.repository";

const approvalRepository = new ApprovalRepository();

/** True when user has a live membership at this gym (renewal vs new join). */
export async function HasLiveMembershipAtGymService(
  userId: string,
  gymId: string,
): Promise<boolean> {
  return approvalRepository.hasLiveMembership(userId, gymId);
}

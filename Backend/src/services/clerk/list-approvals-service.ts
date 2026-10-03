import { ApprovalRepository } from "@/repositories/approval.repository";

const approvalRepository = new ApprovalRepository();

/** GET /api/clerk/approvals — every walk-in request for the gym, newest first. */
export async function ListClerkApprovalsService(gymId: string) {
  return approvalRepository.listByGym(gymId);
}

import { ApprovalRepository } from "@/repositories/approval.repository";

const approvalRepository = new ApprovalRepository();

/**
 * GET /api/clerk/walk-in-payments — approved requests waiting for
 * front-desk cash confirmation (Done), oldest first.
 */
export async function ListWalkInPaymentsService(gymId: string) {
  return approvalRepository.listOpenApprovedByGym(gymId);
}

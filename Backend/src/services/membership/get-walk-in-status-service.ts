import { ApprovalRepository } from "@/repositories/approval.repository";
import { ShapeApprovalPayloadService as shapeApprovalPayload } from "@/services/membership/shape-approval-payload-service";

const approvalRepository = new ApprovalRepository();

/** GET /api/user/walk-in-status — every walk-in request for the gymer. */
export async function GetWalkInStatusService(userId: string) {
  const approvals = await approvalRepository.listByUser(userId);
  return approvals.map((a) => shapeApprovalPayload(a));
}

import { ApprovalRepository } from "@/repositories/approval.repository";
import { GetStaffGymService } from "@/services/gym/get-staff-gym-service";
import { MarkApprovedOnlyService as markApprovedOnly } from "@/services/membership/mark-approved-only-service";

const approvalRepository = new ApprovalRepository();

type MarkApproved = Awaited<ReturnType<typeof markApprovedOnly>>;
type ApproveWalkInResult =
  | { kind: "not-found" }
  | { kind: "forbidden" }
  | { kind: "error"; status: number; message: string }
  | {
      kind: "ok";
      shaped: Extract<MarkApproved, { ok: true }>["shaped"];
      isRenewal: boolean;
    };

/**
 * PUT /api/clerk/approvals/:id/approve — PENDING → APPROVED only, scoped to
 * the staff member's gym.
 */
export async function ApproveWalkInService(input: {
  approvalId: string;
  actorId: string;
}): Promise<ApproveWalkInResult> {
  const approval = await approvalRepository.findApprovalById({
    where: { id: input.approvalId },
    select: { id: true, gymId: true },
  });

  if (!approval) {
    return { kind: "not-found" };
  }

  const gym = await GetStaffGymService(input.actorId);
  if (!gym || gym.id !== approval.gymId) {
    return { kind: "forbidden" };
  }

  const result = await markApprovedOnly({
    approvalId: approval.id,
    actorId: input.actorId,
  });

  if (!result.ok) {
    return { kind: "error", status: result.status, message: result.message };
  }

  return { kind: "ok", shaped: result.shaped, isRenewal: result.isRenewal };
}

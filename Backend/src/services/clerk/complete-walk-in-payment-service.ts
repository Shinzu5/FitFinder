import { ApprovalRepository } from "@/repositories/approval.repository";
import { UserRepository } from "@/repositories/user.repository";
import { GetStaffGymService } from "@/services/gym/get-staff-gym-service";
import { ActivateFromApprovalService as activateFromApproval } from "@/services/membership/activate-from-approval-service";
import type { RegisteredBy } from "@/types/membership";

const approvalRepository = new ApprovalRepository();
const userRepository = new UserRepository();

type ActivateResult = Awaited<ReturnType<typeof activateFromApproval>>;

type CompleteWalkInPaymentResult =
  | { kind: "not-found" }
  | { kind: "forbidden" }
  | { kind: "error"; status: number; message: string }
  | {
      kind: "ok";
      shaped: Extract<ActivateResult, { ok: true }>["shaped"];
      membership: Extract<ActivateResult, { ok: true }>["membership"];
      isRenewal: boolean;
    };

/**
 * POST /api/clerk/walk-in-payments/:id/complete — staff Done:
 * APPROVED → ACTIVE (same shared activation as gymer Done).
 */
export async function CompleteWalkInPaymentService(input: {
  approvalId: string;
  actorId: string;
}): Promise<CompleteWalkInPaymentResult> {
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

  const actor = await userRepository.findRoleById(input.actorId);
  const registeredBy: RegisteredBy =
    actor?.role === "OWNER" ? "OWNER" : "CLERK";

  const result = await activateFromApproval({
    approvalId: approval.id,
    actorId: input.actorId,
    registeredBy,
  });

  if (!result.ok) {
    return { kind: "error", status: result.status, message: result.message };
  }

  return {
    kind: "ok",
    shaped: result.shaped,
    membership: result.membership,
    isRenewal: result.isRenewal,
  };
}

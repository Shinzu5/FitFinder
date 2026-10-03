import { ApprovalRepository } from "@/repositories/approval.repository";
import { MembershipRepository } from "@/repositories/membership.repository";
import { ActivateFromApprovalService as activateFromApproval } from "@/services/membership/activate-from-approval-service";
import { EnsureActiveGymService as ensureActiveGymIfEmpty } from "@/services/gym/ensure-active-gym-service";

const approvalRepository = new ApprovalRepository();
const membershipRepository = new MembershipRepository();

type ApprovalWithRelations = NonNullable<
  Awaited<ReturnType<ApprovalRepository["findByIdWithPlanAndGym"]>>
>;
type AnyMembership = NonNullable<
  Awaited<ReturnType<MembershipRepository["findAnyByUserAndGym"]>>
>;
type Activated = Extract<
  Awaited<ReturnType<typeof activateFromApproval>>,
  { ok: true }
>;

type CompleteWalkInResult =
  | { kind: "not-found" }
  | {
      kind: "already";
      approval: ApprovalWithRelations;
      membership: AnyMembership;
    }
  | { kind: "activate-failed"; status: number; message: string }
  | {
      kind: "activated";
      approval: ApprovalWithRelations;
      shaped: Activated["shaped"];
      membership: Activated["membership"];
    };

/**
 * POST /api/user/walk-in-done/:id — gymer Done after approval → ACTIVE.
 * Idempotent: already-activated requests return the existing membership.
 */
export async function CompleteWalkInService(opts: {
  approvalId: string;
  userId: string;
}): Promise<CompleteWalkInResult> {
  const approval = await approvalRepository.findByIdWithPlanAndGym(opts.approvalId);

  if (!approval || approval.userId !== opts.userId) {
    return { kind: "not-found" };
  }

  // Idempotent: already activated
  if (approval.status === "APPROVED" && approval.consumedAt) {
    const membership = await membershipRepository.findAnyByUserAndGym(
      opts.userId,
      approval.gymId,
    );
    if (membership) {
      await ensureActiveGymIfEmpty(opts.userId, approval.gymId);
      return { kind: "already", approval, membership };
    }
  }

  const result = await activateFromApproval({
    approvalId: approval.id,
    actorId: opts.userId,
    registeredBy: "SELF",
  });

  if (!result.ok) {
    return { kind: "activate-failed", status: result.status, message: result.message };
  }

  return { kind: "activated", approval, shaped: result.shaped, membership: result.membership };
}

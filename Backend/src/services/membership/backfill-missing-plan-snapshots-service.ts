import { MembershipRepository } from "@/repositories/membership.repository";
import { ApprovalRepository } from "@/repositories/approval.repository";
import { MembershipPlanSnapshotService as membershipPlanSnapshot } from "@/services/membership/membership-plan-snapshot-service";

const membershipRepository = new MembershipRepository();
const approvalRepository = new ApprovalRepository();

/** Backfill empty snapshots from the linked plan (safe for soft-deleted plans). */
export async function BackfillMissingPlanSnapshotsService(): Promise<void> {
  const memberships = await membershipRepository.listMissingPlanSnapshots();

  for (const m of memberships) {
    if (!m.plan) continue;
    await membershipRepository.updatePlanSnapshot(
      m.id,
      membershipPlanSnapshot(m.plan),
    );
  }

  const approvals = await approvalRepository.listMissingPlanSnapshots();

  for (const a of approvals) {
    if (!a.plan) continue;
    await approvalRepository.updatePlanSnapshot(a.id, {
      planName: a.plan.name,
      planPrice: a.plan.price,
    });
  }
}

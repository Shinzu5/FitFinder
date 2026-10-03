import { MembershipRepository } from "@/repositories/membership.repository";
import { EmitMembershipPlansUpdatedService as emitMembershipPlansUpdated } from "@/services/realtime/emit-membership-plans-updated-service";

const membershipRepository = new MembershipRepository();

type UpdateMembershipPlanResult =
  | { kind: "not-found" }
  | { kind: "ok"; plan: Awaited<ReturnType<MembershipRepository["updatePlanRow"]>> };

/** PUT /api/owner/membership-plans/:id — update one of the gym's active plans. */
export async function UpdateMembershipPlanService(input: {
  gymId: string;
  planId: string;
  body: any;
}): Promise<UpdateMembershipPlanResult> {
  const existing = await membershipRepository.findPlan({
    where: { id: input.planId, gymId: input.gymId, isActive: true },
  });
  if (!existing) {
    return { kind: "not-found" };
  }

  const plan = await membershipRepository.updatePlanRow(existing.id, {
    name: input.body.name,
    price: input.body.price,
    durationDays: input.body.durationDays,
  });

  void emitMembershipPlansUpdated(input.gymId);

  return { kind: "ok", plan };
}

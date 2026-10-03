import { MembershipRepository } from "@/repositories/membership.repository";
import { EmitMembershipPlansUpdatedService as emitMembershipPlansUpdated } from "@/services/realtime/emit-membership-plans-updated-service";

const membershipRepository = new MembershipRepository();

/** POST /api/owner/membership-plans — create a plan for the owner's gym. */
export async function CreateMembershipPlanService(input: {
  gymId: string;
  name: any;
  price: any;
  durationDays: any;
}) {
  const plan = await membershipRepository.createPlanRow({
    gymId: input.gymId,
    name: input.name,
    price: input.price,
    durationDays: input.durationDays,
  });

  void emitMembershipPlansUpdated(input.gymId);

  return plan;
}

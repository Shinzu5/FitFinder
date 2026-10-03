import { MembershipRepository } from "@/repositories/membership.repository";
import { UserRepository } from "@/repositories/user.repository";
import { GymRepository } from "@/repositories/gym.repository";
import { emitToGym, emitToRoom, emitToUser } from "@/socket";

const membershipRepository = new MembershipRepository();
const userRepository = new UserRepository();
const gymRepository = new GymRepository();

/** Push latest membership plans from Neon to every clerk assigned to this gym. */
export async function EmitMembershipPlansUpdatedService(gymId: string): Promise<void> {
  const [plans, clerks, gym] = await Promise.all([
    membershipRepository.listActiveByGym(gymId),
    userRepository.findClerkIdsByGym(gymId),
    gymRepository.findOwnerId(gymId),
  ]);

  const payload = {
    gymId,
    plans: plans.map((plan) => ({
      id: plan.id,
      label: plan.name,
      price: plan.price,
      durationDays: plan.durationDays,
    })),
    hasActivePlans: plans.length > 0,
    /** Lowest active plan price for home gym cards — never base membership price */
    startingPrice: plans[0]?.price ?? null,
  };

  for (const clerk of clerks) {
    emitToUser(clerk.id, "membership_plans_updated", payload);
  }
  if (gym?.ownerId) {
    emitToUser(gym.ownerId, "membership_plans_updated", payload);
  }
  // Purchase / gym profile pages join gym:{id} — hide deleted plans live
  emitToGym(gymId, "membership_plans_updated", payload);
  // Home gym list (all connected clients join gym_catalog on connect)
  emitToRoom("gym_catalog", "gym_plans_catalog_updated", payload);
}

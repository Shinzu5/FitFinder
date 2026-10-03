import { EmitMembershipUpdatedService as emitMembershipUpdated } from "@/services/realtime/emit-membership-updated-service";
import { EmitMembersUpdatedService as emitMembersUpdated } from "@/services/realtime/emit-members-updated-service";

/** Notify gymer + Owner/Clerk members lists after create/update/expire. */
export async function NotifyMembershipChangeService(userId: string, gymId: string): Promise<void> {
  const { EnsureActiveGymService: ensureActiveGymIfEmpty } = await import("@/services/gym/ensure-active-gym-service");
  await ensureActiveGymIfEmpty(userId, gymId);
  emitMembershipUpdated(userId);
  await emitMembersUpdated(gymId);
}

import { emitToUser } from "@/socket";

/** Tell the gymer their membership (and assigned coach) is ready. */
export function EmitMembershipUpdatedService(userId: string): void {
  emitToUser(userId, "membership_updated", {});
}

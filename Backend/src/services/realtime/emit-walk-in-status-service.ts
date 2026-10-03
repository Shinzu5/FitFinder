import { emitToUser } from "@/socket";

/** Push walk-in approval status to the gymer (Proceed → Waiting → Done). */
export function EmitWalkInStatusService(userId: string, approval: unknown): void {
  emitToUser(userId, "walk_in_status", { approval });
}

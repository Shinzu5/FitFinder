import { emitToUser } from "@/socket";

export function EmitToUserSafeService(userId: string, event: string, payload: unknown): void {
  emitToUser(userId, event, payload);
}

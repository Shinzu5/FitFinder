import { getIO, userRoom } from "@/socket";
import { EmitAccountDeletedService as emitAccountDeleted } from "@/services/realtime/emit-account-deleted-service";

export function KickUserSessionService(
  userId: string,
  message = "Your account has been removed. Please sign in again.",
): void {
  emitAccountDeleted(userId, message);
  try {
    getIO().in(userRoom(userId)).disconnectSockets(true);
  } catch {
    // Socket server may not be ready in tests
  }
}

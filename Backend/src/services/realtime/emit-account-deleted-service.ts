import { emitToUser } from "@/socket";

/** Force-logout a user whose account was deleted (Admin or Gym Owner). */
export function EmitAccountDeletedService(
  userId: string,
  message = "Your account has been removed. Please sign in again.",
): void {
  emitToUser(userId, "account_deleted", { message });
}

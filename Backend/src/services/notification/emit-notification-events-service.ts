import { emitToUser } from "@/socket";
import type { SerializedNotification } from "@/types/notification";

export function EmitNotificationEventsService(
  userId: string,
  notification: SerializedNotification,
  unreadCount: number,
): void {
  emitToUser(userId, "notification", { notification, unreadCount });
  emitToUser(userId, "notifications_updated", { unreadCount });
}

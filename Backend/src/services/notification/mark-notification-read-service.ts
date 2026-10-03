import { NotificationRepository } from "@/repositories/notification.repository";
import { emitToUser } from "@/socket";
import type { SerializedNotification } from "@/types/notification";
import { SerializeNotificationService as serializeNotification } from "@/services/notification/serialize-notification-service";
import { UnreadCountForService as unreadCountFor } from "@/services/notification/unread-count-for-service";

const notificationRepository = new NotificationRepository();

export async function MarkNotificationReadService(
  userId: string,
  notificationId: string,
): Promise<SerializedNotification | null> {
  const existing = await notificationRepository.findForUser(notificationId, userId);
  if (!existing) return null;

  const updated = existing.readAt
    ? existing
    : await notificationRepository.markRead(existing.id, new Date());

  const serialized = serializeNotification(updated);
  const unreadCount = await unreadCountFor(userId);
  emitToUser(userId, "notifications_updated", { unreadCount });
  emitToUser(userId, "notification_read", { notification: serialized, unreadCount });
  return serialized;
}

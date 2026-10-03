import { NotificationRepository } from "@/repositories/notification.repository";
import type { SerializedNotification } from "@/types/notification";
import { SerializeNotificationService as serializeNotification } from "@/services/notification/serialize-notification-service";
import { UnreadCountForService as unreadCountFor } from "@/services/notification/unread-count-for-service";

const notificationRepository = new NotificationRepository();

export async function ListNotificationsService(
  userId: string,
  opts?: { limit?: number; unreadOnly?: boolean },
): Promise<{ notifications: SerializedNotification[]; unreadCount: number }> {
  const limit = Math.min(Math.max(opts?.limit ?? 50, 1), 100);
  const [rows, unreadCount] = await Promise.all([
    opts?.unreadOnly
      ? notificationRepository.listRecentUnread(userId, limit)
      : notificationRepository.listRecent(userId, limit),
    unreadCountFor(userId),
  ]);

  return {
    notifications: rows.map(serializeNotification),
    unreadCount,
  };
}

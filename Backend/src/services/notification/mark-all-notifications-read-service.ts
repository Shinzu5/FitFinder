import { NotificationRepository } from "@/repositories/notification.repository";
import { emitToUser } from "@/socket";

const notificationRepository = new NotificationRepository();

export async function MarkAllNotificationsReadService(userId: string): Promise<number> {
  const result = await notificationRepository.markAllRead(userId, new Date());
  // Re-query instead of hardcoding 0 so the badge/socket state stays truthful
  // when a new notification lands concurrently with the update.
  const unreadCount = await notificationRepository.countUnread(userId);
  emitToUser(userId, "notifications_updated", { unreadCount });
  return result.count;
}

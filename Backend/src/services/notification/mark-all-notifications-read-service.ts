import { NotificationRepository } from "@/repositories/notification.repository";
import { emitToUser } from "@/socket";

const notificationRepository = new NotificationRepository();

export async function MarkAllNotificationsReadService(userId: string): Promise<number> {
  const result = await notificationRepository.markAllRead(userId, new Date());
  const unreadCount = 0;
  emitToUser(userId, "notifications_updated", { unreadCount });
  return result.count;
}

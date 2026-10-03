import { NotificationRepository } from "@/repositories/notification.repository";

const notificationRepository = new NotificationRepository();

export async function UnreadCountForService(userId: string): Promise<number> {
  return notificationRepository.countUnread(userId);
}

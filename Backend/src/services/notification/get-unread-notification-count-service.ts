import { UnreadCountForService as unreadCountFor } from "@/services/notification/unread-count-for-service";

export async function GetUnreadNotificationCountService(userId: string): Promise<number> {
  return unreadCountFor(userId);
}

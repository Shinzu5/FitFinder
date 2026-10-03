import type { Prisma } from "@prisma/client";
import { NotificationRepository } from "@/repositories/notification.repository";
import type { NotificationType, SerializedNotification } from "@/types/notification";
import { SerializeNotificationService as serializeNotification } from "@/services/notification/serialize-notification-service";
import { EmitNotificationEventsService as emitNotificationEvents } from "@/services/notification/emit-notification-events-service";
import { UnreadCountForService as unreadCountFor } from "@/services/notification/unread-count-for-service";
import { CreateNotificationService as createNotification } from "@/services/notification/create-notification-service";

const notificationRepository = new NotificationRepository();

/** Update body/data of an existing notification (by dedupeKey) and re-emit. */
export async function UpsertLiveNotificationService(input: {
  userId: string;
  type: NotificationType | string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  dedupeKey: string;
}): Promise<SerializedNotification | null> {
  const { userId, type, title, body, data = {}, dedupeKey } = input;

  const existing = await notificationRepository.findByDedupeKey(dedupeKey);
  if (existing) {
    const updated = await notificationRepository.updateById(existing.id, {
      title,
      body,
      data: data as Prisma.InputJsonValue,
      type,
      // Keep unread so the owner keeps seeing live countdown updates
      readAt: null,
    });
    const serialized = serializeNotification(updated);
    const unreadCount = await unreadCountFor(userId);
    emitNotificationEvents(userId, serialized, unreadCount);
    return serialized;
  }

  return createNotification({ userId, type, title, body, data, dedupeKey });
}

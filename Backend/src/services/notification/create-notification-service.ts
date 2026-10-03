import type { Prisma } from "@prisma/client";
import { NotificationRepository } from "@/repositories/notification.repository";
import type { CreateNotificationInput, SerializedNotification } from "@/types/notification";
import { SerializeNotificationService as serializeNotification } from "@/services/notification/serialize-notification-service";
import { EmitNotificationEventsService as emitNotificationEvents } from "@/services/notification/emit-notification-events-service";
import { UnreadCountForService as unreadCountFor } from "@/services/notification/unread-count-for-service";

const notificationRepository = new NotificationRepository();

/** Persist a notification and push it over Socket.IO. Dedupes on dedupeKey. */
export async function CreateNotificationService(
  input: CreateNotificationInput,
): Promise<SerializedNotification | null> {
  const { userId, type, title, body, data = {}, dedupeKey = null } = input;
  if (!userId) return null;

  if (dedupeKey) {
    const existing = await notificationRepository.findByDedupeKey(dedupeKey);
    if (existing) {
      return serializeNotification(existing);
    }
  }

  try {
    const created = await notificationRepository.create({
      userId,
      type,
      title,
      body,
      data: data as Prisma.InputJsonValue,
      dedupeKey: dedupeKey || null,
    });

    const serialized = serializeNotification(created);
    const unreadCount = await unreadCountFor(userId);
    emitNotificationEvents(userId, serialized, unreadCount);
    return serialized;
  } catch (error: unknown) {
    // Unique race on dedupeKey — return existing
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: string }).code)
        : "";
    if (code === "P2002" && dedupeKey) {
      const existing = await notificationRepository.findByDedupeKey(dedupeKey);
      return existing ? serializeNotification(existing) : null;
    }
    console.error("createNotification failed:", error);
    return null;
  }
}

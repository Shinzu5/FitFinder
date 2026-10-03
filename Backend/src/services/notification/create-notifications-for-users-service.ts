import type { CreateNotificationInput } from "@/types/notification";
import { CreateNotificationService as createNotification } from "@/services/notification/create-notification-service";

export async function CreateNotificationsForUsersService(
  userIds: string[],
  payload: Omit<CreateNotificationInput, "userId">,
): Promise<void> {
  const unique = [...new Set(userIds.filter(Boolean))];
  await Promise.all(
    unique.map((userId) =>
      createNotification({
        ...payload,
        userId,
        dedupeKey: payload.dedupeKey ? `${payload.dedupeKey}:${userId}` : null,
      }),
    ),
  );
}

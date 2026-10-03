import { GymRepository } from "@/repositories/gym.repository";
import { UserRepository } from "@/repositories/user.repository";
import type { CreateNotificationInput } from "@/types/notification";
import { CreateNotificationsForUsersService as createNotificationsForUsers } from "@/services/notification/create-notifications-for-users-service";

const gymRepository = new GymRepository();
const userRepository = new UserRepository();

/** Owner + clerks assigned to a gym. */
export async function NotifyGymStaffService(
  gymId: string,
  payload: Omit<CreateNotificationInput, "userId" | "dedupeKey"> & {
    dedupeKeyPrefix: string;
  },
): Promise<void> {
  const [gym, clerks] = await Promise.all([
    gymRepository.findOwnerId(gymId),
    userRepository.findClerkIdsByGym(gymId),
  ]);

  const ids = [
    ...(gym?.ownerId ? [gym.ownerId] : []),
    ...clerks.map((c) => c.id),
  ];

  await createNotificationsForUsers(ids, {
    type: payload.type,
    title: payload.title,
    body: payload.body,
    data: { ...(payload.data || {}), gymId },
    dedupeKey: payload.dedupeKeyPrefix,
  });
}

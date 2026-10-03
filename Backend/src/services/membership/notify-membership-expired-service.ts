import { CreateNotificationService as createNotification } from "@/services/notification/create-notification-service";

export async function NotifyMembershipExpiredService(opts: {
  userId: string;
  gymId: string;
  membershipId: string;
  gymName?: string;
}): Promise<void> {
  const { userId, gymId, membershipId, gymName } = opts;
  await createNotification({
    userId,
    type: "MEMBERSHIP_EXPIRED",
    title: "Membership expired",
    body: gymName
      ? `Your membership at ${gymName} has expired. Renew to restore access.`
      : "Your membership has expired. Renew to restore access.",
    data: { gymId, membershipId, gymName: gymName || "" },
    dedupeKey: `membership_expired:${membershipId}`,
  });
}

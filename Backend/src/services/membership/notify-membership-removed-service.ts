import { CreateNotificationService as createNotification } from "@/services/notification/create-notification-service";

export async function NotifyMembershipRemovedService(opts: {
  userId: string;
  gymId: string;
  gymName: string;
  membershipId: string;
}): Promise<void> {
  const { userId, gymId, gymName, membershipId } = opts;
  const gymLabel = gymName.trim() || "your gym";
  await createNotification({
    userId,
    type: "MEMBERSHIP_REMOVED",
    title: "Membership removed",
    body: `Your membership at ${gymLabel} was removed by the owner.`,
    data: { gymId, gymName: gymLabel, membershipId, reason: "removed_by_owner" },
    dedupeKey: `membership_removed:${membershipId}`,
  });
}

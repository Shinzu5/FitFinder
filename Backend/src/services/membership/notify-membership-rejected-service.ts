import { CreateNotificationService as createNotification } from "@/services/notification/create-notification-service";

export async function NotifyMembershipRejectedService(opts: {
  userId: string;
  gymId: string;
  gymName: string;
  approvalId: string;
  reason?: string;
}): Promise<void> {
  const { userId, gymId, gymName, approvalId, reason } = opts;
  await createNotification({
    userId,
    type: "MEMBERSHIP_REJECTED",
    title: "Membership rejected",
    body: reason?.trim()
      ? `Your membership request for ${gymName} was rejected. Reason: ${reason.trim()}`
      : `Your membership request for ${gymName} was rejected.`,
    data: { gymId, gymName, approvalId, reason: reason || "" },
    dedupeKey: `membership_rejected:${approvalId}`,
  });
}

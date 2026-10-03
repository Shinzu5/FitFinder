import { CreateNotificationService as createNotification } from "@/services/notification/create-notification-service";

export async function NotifyMembershipApprovedService(opts: {
  userId: string;
  gymId: string;
  gymName: string;
  approvalId: string;
  isRenewal: boolean;
}): Promise<void> {
  const { userId, gymId, gymName, approvalId, isRenewal } = opts;

  if (isRenewal) {
    await createNotification({
      userId,
      type: "MEMBERSHIP_RENEWED",
      title: "Renewal approved",
      body: `Your renewal at ${gymName} was approved. Tap Done on My Membership to apply your new days.`,
      data: { gymId, gymName, approvalId, isRenewal: true },
      dedupeKey: `membership_renewed:${approvalId}`,
    });
    return;
  }

  await createNotification({
    userId,
    type: "MEMBERSHIP_APPROVED",
    title: "Membership approved",
    body: `Your membership request for ${gymName} was approved. Tap Done to activate access.`,
    data: { gymId, gymName, approvalId, isRenewal: false },
    dedupeKey: `membership_approved:${approvalId}`,
  });
}

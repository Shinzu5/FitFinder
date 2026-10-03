import { CreateNotificationService as createNotification } from "@/services/notification/create-notification-service";
import { NotifyGymStaffService as notifyGymStaff } from "@/services/notification/notify-gym-staff-service";

/** Gymer submitted a join/renewal request (walk-in or GCash). */
export async function NotifyMembershipRequestSubmittedService(opts: {
  userId: string;
  gymId: string;
  gymName: string;
  approvalId: string;
  memberName: string;
  isRenewal: boolean;
  paymentMethod?: string;
}): Promise<void> {
  const {
    userId,
    gymId,
    gymName,
    approvalId,
    memberName,
    isRenewal,
    paymentMethod = "WALK_IN",
  } = opts;

  await createNotification({
    userId,
    type: "MEMBERSHIP_REQUEST_SUBMITTED",
    title: isRenewal ? "Renewal request submitted" : "Membership request submitted",
    body: isRenewal
      ? `Your renewal request for ${gymName} was submitted and is awaiting approval.`
      : `Your membership request for ${gymName} was submitted and is awaiting approval.`,
    data: { gymId, gymName, approvalId, isRenewal },
    dedupeKey: `membership_request_submitted:${approvalId}`,
  });

  await notifyGymStaff(gymId, {
    type: isRenewal ? "MEMBERSHIP_RENEWAL_REQUEST" : "MEMBERSHIP_REQUEST_NEW",
    title: isRenewal ? "New renewal request" : "New membership request",
    body: isRenewal
      ? `${memberName} submitted a renewal request.`
      : `${memberName} submitted a new membership request.`,
    data: {
      gymId,
      gymName,
      approvalId,
      memberName,
      isRenewal,
      userId,
    },
    dedupeKeyPrefix: isRenewal
      ? `membership_renewal_request:${approvalId}`
      : `membership_request_new:${approvalId}`,
  });

  // Payment confirmation (walk-in Proceed / GCash paid → pending approval)
  await notifyGymStaff(gymId, {
    type: "PAYMENT_CONFIRMATION",
    title: "Payment confirmation submitted",
    body: `${memberName} submitted a ${paymentMethod === "XENDIT" ? "GCash" : "walk-in"} payment confirmation.`,
    data: {
      gymId,
      gymName,
      approvalId,
      memberName,
      isRenewal,
      userId,
      paymentMethod,
    },
    dedupeKeyPrefix: `payment_confirmation:${approvalId}`,
  });
}

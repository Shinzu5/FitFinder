import {
  createNotification,
  notifyGymStaff,
} from "./notification.service";

/** Gymer submitted a join/renewal request (walk-in or GCash). */
export async function notifyMembershipRequestSubmitted(opts: {
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

export async function notifyMembershipApproved(opts: {
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

export async function notifyMembershipRejected(opts: {
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

export async function notifyMembershipExpired(opts: {
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

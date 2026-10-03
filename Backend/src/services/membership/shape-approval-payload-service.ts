export function ShapeApprovalPayloadService(
  a: {
    id: string;
    userId: string;
    memberName: string;
    memberEmail: string;
    gymId: string;
    planId: string | null;
    planName?: string;
    planPrice?: number;
    coachId: string | null;
    coachName: string | null;
    coachSessionPrice: number;
    paymentRef: string;
    totalPaid: number;
    durationDays: number;
    isRenewal?: boolean;
    paymentMethod?: string | null;
    status: string;
    paymentStatus?: string | null;
    rejectionReason?: string | null;
    submittedAt: Date;
    reviewedAt: Date | null;
    consumedAt: Date | null;
    plan?: { name: string; price: number } | null;
    gym?: { name: string } | null;
  },
  gymNameFallback?: string,
) {
  const method = String(a.paymentMethod || "WALK_IN").toUpperCase();
  return {
    id: a.id,
    userId: a.userId,
    memberName: a.memberName,
    memberEmail: a.memberEmail,
    gymId: a.gymId,
    gymName: a.gym?.name || gymNameFallback || "",
    planId: a.planId,
    planName: a.planName || a.plan?.name || "",
    planPrice: a.planPrice && a.planPrice > 0 ? a.planPrice : a.plan?.price ?? 0,
    coachId: a.coachId,
    coachName: a.coachName,
    coachSessionPrice: a.coachSessionPrice,
    paymentRef: a.paymentRef,
    totalPaid: a.totalPaid,
    durationDays: a.durationDays,
    isRenewal: Boolean(a.isRenewal),
    paymentMethod: method === "XENDIT" ? "Cashless" : "Walk-in",
    paymentMethodRaw: method,
    paymentStatus: String(a.paymentStatus || "PAID").toLowerCase(),
    approvalStatus: String(a.status).toLowerCase(),
    status: String(a.status).toLowerCase(),
    rejectionReason: a.rejectionReason || "",
    submittedAt: a.submittedAt.getTime(),
    reviewedAt: a.reviewedAt?.getTime() ?? null,
    consumedAt: a.consumedAt?.getTime() ?? null,
    renewalDate: a.submittedAt.getTime(),
  };
}

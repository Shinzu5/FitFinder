import { SubscriptionRepository } from "@/repositories/subscription.repository";
import { daysRemainingUntil } from "@/utils/ownerPlan";
import { GetSucceededOwnerPaymentsService as getSucceededOwnerPayments } from "@/services/admin/get-succeeded-owner-payments-service";
import { PlanInfoFromPaymentMetadataService as planInfoFromPaymentMetadata } from "@/services/admin/plan-info-from-payment-metadata-service";

const subscriptionRepository = new SubscriptionRepository();

export async function BuildAdminTransactionRowsService(now = new Date()) {
  const payments = await getSucceededOwnerPayments();
  const refs = payments.map((p) => p.referenceId);
  const subs = refs.length
    ? await subscriptionRepository.listByReferenceNos(refs)
    : [];
  const subByRef = new Map(subs.map((s) => [s.referenceNo, s]));

  return payments.map((p) => {
    const info = planInfoFromPaymentMetadata(p.metadata, p.amount);
    const sub = subByRef.get(p.referenceId);
    return {
      id: p.id,
      gymName: sub?.gym?.name || "Pending setup",
      ownerId: p.userId,
      ownerName: p.user.fullName,
      ownerEmail: p.user.email,
      planId: info.planId,
      planName: info.planName,
      type: "Owner Plan" as const,
      amount: p.amount,
      method: "Xendit",
      referenceNo: p.referenceId,
      createdAt: (p.paidAt || p.createdAt).toISOString(),
      validUntil: sub?.validUntil?.toISOString() || null,
      daysLeft: sub ? daysRemainingUntil(sub.validUntil, now) : null,
      months: info.durationDays,
      durationDays: info.durationDays,
    };
  });
}

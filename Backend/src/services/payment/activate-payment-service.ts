import { AdminRepository } from "@/repositories/admin.repository";
import { ApprovalRepository } from "@/repositories/approval.repository";
import { CatalogRepository } from "@/repositories/catalog.repository";
import { MembershipRepository } from "@/repositories/membership.repository";
import { NotificationRepository } from "@/repositories/notification.repository";
import { UserRepository } from "@/repositories/user.repository";
import { NotifyMembershipChangeService as notifyMembershipChange } from "@/services/membership/notify-membership-change-service";
import { CreatePendingApprovalService as createPendingApproval } from "@/services/membership/create-pending-approval-service";
import { EnsureOwnerSubscriptionFromPaymentService as ensureOwnerSubscriptionFromPayment } from "@/services/subscription/ensure-owner-subscription-from-payment-service";
import { CreateNotificationService as createNotification } from "@/services/notification/create-notification-service";
import { EmitAdminGymsUpdatedService as emitAdminGymsUpdated } from "@/services/realtime/emit-admin-gyms-updated-service";

const adminRepository = new AdminRepository();
const approvalRepository = new ApprovalRepository();
const catalogRepository = new CatalogRepository();
const membershipRepository = new MembershipRepository();
const notificationRepository = new NotificationRepository();
const userRepository = new UserRepository();

/**
 * Idempotent post-payment activation for owner SUBSCRIPTION or MEMBERSHIP (approval queue).
 * Moved out of payment.controller — all DB access lives in repositories.
 */
export async function ActivatePaymentService(payment: {
  id: string;
  userId: string;
  type: string;
  amount: number;
  referenceId: string;
  metadata: unknown;
}): Promise<boolean> {
  const meta = (payment.metadata || {}) as Record<string, unknown>;

  if (payment.type === "SUBSCRIPTION") {
    try {
      const sub = await ensureOwnerSubscriptionFromPayment(payment);
      if (sub?.created) {
        await adminRepository.createActivity({
          data: {
            message: `New subscription purchase: ${sub.planName || "Unknown"} plan via GCash`,
            tone: "INFO",
          },
        });
        // Clear live expiry countdown after renew / purchase
        await notificationRepository.markLiveCountdownRead(
          payment.userId,
          `owner_plan_live:${payment.userId}`,
          new Date(),
        );
        void createNotification({
          userId: payment.userId,
          type: "OWNER_PLAN_EXPIRING",
          title: "Gym subscription renewed",
          body: "Your gym subscription was renewed successfully.",
          data: {
            planName: sub.planName,
            daysLeft: sub.daysLeft,
          },
          dedupeKey: `owner_plan_renewed:${payment.referenceId}`,
        });
      }
      // Always refresh admin gyms/transactions when a plan payment succeeds
      void emitAdminGymsUpdated();
      return Boolean(sub);
    } catch (error) {
      console.error("ActivatePaymentService SUBSCRIPTION failed:", error);
      return false;
    }
  }

  if (payment.type === "MEMBERSHIP") {
    const gymId = meta.gymId as string | undefined;
    const planId = meta.planId as string | undefined;
    const coachId = (meta.coachId as string) || null;

    if (!gymId || !planId) {
      console.error("ActivatePaymentService MEMBERSHIP missing gymId/planId", meta);
      return false;
    }

    // Idempotent: same Xendit payment must not re-extend dates
    const alreadyActivated = await membershipRepository.findMembership({
      where: {
        userId: payment.userId,
        gymId,
        paymentRef: payment.referenceId,
      },
      select: { id: true },
    });
    if (alreadyActivated) {
      await notifyMembershipChange(payment.userId, gymId);
      return true;
    }

    const existingApproval = await approvalRepository.findByPaymentRef(
      payment.referenceId,
    );
    if (existingApproval) {
      return true;
    }

    const plan = await membershipRepository.findPlanById({
      where: { id: planId },
    });
    if (!plan) {
      console.error("ActivatePaymentService MEMBERSHIP plan missing — cannot create membership", planId);
      return false;
    }

    const existingMembership = await membershipRepository.findMembership({
      where: {
        userId: payment.userId,
        gymId,
        status: { in: ["ACTIVE", "EXPIRING"] },
        expiresAt: { gt: new Date() },
      },
      orderBy: { joinedAt: "desc" },
      select: { id: true },
    });

    // Renewal or new join via GCash → PENDING approval only (ACTIVE waits for Done)
    const user = await userRepository.findContactById(payment.userId);
    const coach = coachId
      ? await catalogRepository.findActiveCoachByIdAndGym(coachId, gymId)
      : null;

    await createPendingApproval({
      userId: payment.userId,
      gymId,
      planId: plan.id,
      planName: plan.name,
      planPrice: plan.price,
      memberName: user?.fullName || "Member",
      memberEmail: user?.email || "",
      coachId: coach?.id || null,
      coachName: coach?.name || null,
      coachSessionPrice: coach?.sessionPrice || 0,
      paymentRef: payment.referenceId,
      totalPaid: payment.amount,
      durationDays: plan.durationDays,
      isRenewal: Boolean(existingMembership),
      paymentMethod: "XENDIT",
    });
    return true;
  }

  return false;
}

import { daysRemainingUntil, storedDurationToDays } from "@/utils/ownerPlan";
import { generateAccessToken, generateRefreshToken } from "@/utils/jwt";
import { MembershipRepository } from "@/repositories/membership.repository";
import { SubscriptionRepository } from "@/repositories/subscription.repository";
import { UserRepository } from "@/repositories/user.repository";
import { ActivatePaymentService as activatePayment } from "@/services/payment/activate-payment-service";
import { GetPaymentStatusService as getPaymentStatus } from "@/services/payment/get-payment-status-service";

const membershipRepository = new MembershipRepository();
const subscriptionRepository = new SubscriptionRepository();
const userRepository = new UserRepository();

type SubscriptionSummary = {
  id: string;
  planName: string;
  months: number;
  durationDays: number;
  validUntil: string;
  daysLeft: number;
};

type AuthPayload = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    role: string;
    avatarUrl: string | null;
  };
};

type CheckPaymentStatusResult =
  | { kind: "not-found" }
  | {
      kind: "ok";
      payment: NonNullable<Awaited<ReturnType<SubscriptionRepository["findByIdOrXenditIdOrReference"]>>>;
      status: string;
      paidAt: Date | null;
      membershipActive: boolean;
      subscription: SubscriptionSummary | null;
      authPayload: AuthPayload | null;
    };

/**
 * GET /api/payments/:id/status — poll Xendit while pending, re-run activation
 * on SUCCEEDED and confirm the unlocked membership/subscription (plus fresh
 * tokens when an owner plan was bought).
 */
export async function CheckPaymentStatusService(
  id: string,
): Promise<CheckPaymentStatusResult> {
  const payment = await subscriptionRepository.findByIdOrXenditIdOrReference(id);

  if (!payment) {
    return { kind: "not-found" };
  }

  let status: string = payment.status;
  let paidAt = payment.paidAt;

  // If payment is still pending, check Xendit for the latest status
  if (payment.status === "PENDING") {
    try {
      const xenditStatus = await getPaymentStatus(payment.xenditPaymentId);

      if (xenditStatus.status !== payment.status) {
        const isSucceeded =
          xenditStatus.status === "SUCCEEDED" ||
          xenditStatus.status === "COMPLETED";

        await subscriptionRepository.updateStatusById(payment.id, {
          status: isSucceeded ? "SUCCEEDED" : xenditStatus.status,
          paidAt: isSucceeded ? new Date() : null,
        });

        status = isSucceeded ? "SUCCEEDED" : xenditStatus.status;
        paidAt = isSucceeded ? new Date() : null;
      }
    } catch (err) {
      console.error("Failed to poll Xendit status:", err);
    }
  }

  let membershipActive = false;
  let subscription: SubscriptionSummary | null = null;
  let authPayload: AuthPayload | null = null;

  if (status === "SUCCEEDED") {
    membershipActive = await activatePayment({
      id: payment.id,
      userId: payment.userId,
      type: payment.type,
      amount: payment.amount,
      referenceId: payment.referenceId,
      metadata: payment.metadata,
    });

    // Confirm ACTIVE membership exists for MEMBERSHIP payments
    if (payment.type === "MEMBERSHIP") {
      const meta = (payment.metadata || {}) as Record<string, unknown>;
      const gymId = meta.gymId as string | undefined;
      if (gymId) {
        const membership = await membershipRepository.findAnyByUserAndGym(
          payment.userId,
          gymId,
        );
        membershipActive = Boolean(membership);
      }
    } else if (payment.type === "SUBSCRIPTION") {
      membershipActive = true;
      const sub = await subscriptionRepository.findLatestByReferenceNo(
        payment.referenceId,
      );
      if (sub) {
        const durationDays = storedDurationToDays(sub.months);
        subscription = {
          id: sub.id,
          planName: sub.planName,
          months: durationDays,
          durationDays,
          validUntil: sub.validUntil.toISOString(),
          daysLeft: daysRemainingUntil(sub.validUntil),
        };
      }

      // Issue fresh tokens so the client becomes OWNER without a page reload
      const user = await userRepository.findById(payment.userId);
      if (user) {
        const accessToken = generateAccessToken({
          userId: user.id,
          role: user.role,
        });
        const refreshToken = generateRefreshToken({
          userId: user.id,
          role: user.role,
        });
        await userRepository.setRefreshToken(user.id, refreshToken);
        authPayload = {
          accessToken,
          refreshToken,
          user: {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            avatarUrl: user.avatarUrl,
          },
        };
      }
    }
  }

  return {
    kind: "ok",
    payment,
    status,
    paidAt,
    membershipActive,
    subscription,
    authPayload,
  };
}

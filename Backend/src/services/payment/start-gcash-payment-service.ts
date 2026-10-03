import { env } from "@/config/env";
import { getOwnerPlanById } from "@/config/ownerPlans";
import { CatalogRepository } from "@/repositories/catalog.repository";
import { GymRepository } from "@/repositories/gym.repository";
import { MembershipRepository } from "@/repositories/membership.repository";
import { SubscriptionRepository } from "@/repositories/subscription.repository";
import { CreateGcashPaymentService as createGcashPayment } from "@/services/payment/create-gcash-payment-service";

const catalogRepository = new CatalogRepository();
const gymRepository = new GymRepository();
const membershipRepository = new MembershipRepository();
const subscriptionRepository = new SubscriptionRepository();

type StartGcashPaymentResult =
  | { kind: "error"; status: number; message: string }
  | {
      kind: "ok";
      paymentId: string;
      xenditPaymentId: string;
      referenceId: string;
      redirectUrl: string;
    };

/**
 * POST /api/payments/create-gcash — validate the checkout, resolve plan/coach
 * and the gym's Xendit key, create the Xendit payment and store the row.
 */
export async function StartGcashPaymentService(input: {
  userId?: string;
  type?: any;
  amount?: any;
  description?: any;
  metadata?: any;
}): Promise<StartGcashPaymentResult> {
  const { userId, type, amount, description } = input;
  let metadata = input.metadata || {};

  const fail = (message: string, status = 400): StartGcashPaymentResult => ({
    kind: "error",
    status,
    message,
  });

  if (!type || !amount || amount <= 0) {
    return fail("Invalid payment parameters");
  }

  if (!["SUBSCRIPTION", "MEMBERSHIP"].includes(type)) {
    return fail("Payment type must be SUBSCRIPTION or MEMBERSHIP");
  }

  if (type === "SUBSCRIPTION") {
    const plan = getOwnerPlanById(String(metadata?.planId || ""));
    if (!plan) {
      return fail("Invalid owner subscription plan");
    }
    if (Math.abs(Number(amount) - plan.price) > 0.01) {
      return fail(
        `Payment amount must equal plan price (₱${plan.price.toLocaleString()})`,
      );
    }
    metadata = {
      ...metadata,
      planId: plan.id,
      planName: plan.name,
      days: plan.days,
      durationDays: plan.days,
      price: plan.price,
    };
  }

  if (type === "MEMBERSHIP") {
    const gymId = metadata?.gymId as string | undefined;
    const planId = metadata?.planId as string | undefined;
    const coachId = (metadata?.coachId as string | undefined) || null;
    if (!gymId || !planId) {
      return fail("Membership payment requires gymId and planId");
    }
    const plan = await membershipRepository.findActiveByIdAndGym(planId, gymId);
    if (!plan) {
      return fail("Membership plan not found for this gym");
    }

    let coachSessionPrice = 0;
    let coachName: string | null = null;
    if (coachId) {
      const coach = await catalogRepository.findActiveCoachByIdAndGym(coachId, gymId);
      if (!coach) {
        return fail(
          "Selected coach is no longer available. Please choose another coach or continue without one.",
        );
      }
      coachSessionPrice = coach.sessionPrice;
      coachName = coach.name;
    }

    const expectedTotal = plan.price + coachSessionPrice;
    if (Math.abs(Number(amount) - expectedTotal) > 0.01) {
      return fail(
        `Payment amount must equal membership + coach session (₱${expectedTotal.toLocaleString()})`,
      );
    }

    metadata = {
      ...metadata,
      durationDays: plan.durationDays,
      planName: plan.name,
      coachId,
      coachName,
      planPrice: plan.price,
      coachSessionPrice,
    };
  }

  // Generate a unique reference ID
  const referenceId = `FF-${type.slice(0, 3)}-${Date.now()}-${Math.floor(
    Math.random() * 9000 + 1000,
  )}`;

  const frontendUrl = env.FRONTEND_URL;

  // Build return URLs based on payment type (use known referenceId — never a placeholder)
  let successUrl: string;
  let failureUrl: string;

  if (type === "SUBSCRIPTION") {
    successUrl = `${frontendUrl}/dashboard/user/create-gym/done?payment_id=${encodeURIComponent(referenceId)}`;
    failureUrl = `${frontendUrl}/dashboard/user/create-gym/payment?payment_failed=true`;
  } else {
    const gymId = metadata?.gymId || "";
    successUrl = `${frontendUrl}/dashboard/user/gym/${gymId}/join/gcash/success?payment_id=${encodeURIComponent(referenceId)}`;
    failureUrl = `${frontendUrl}/dashboard/user/gym/${gymId}/join/gcash?payment_failed=true`;
  }

  // Membership cashless uses the gym's Xendit key; Owner plan uses platform key
  let gymApiKey: string | undefined;
  if (type === "MEMBERSHIP") {
    const gymId = metadata?.gymId as string;
    const gym = await gymRepository.findById(gymId);
    if (!gym) {
      return fail("Gym not found", 404);
    }
    const key = (gym.xenditApiKey || "").trim();
    const keyOk =
      key.startsWith("xnd_production_") || key.startsWith("xnd_development_");
    if (!gym.xenditEnabled || !keyOk) {
      return fail(
        "Cashless payment is not available for this gym. Choose Walk-in Payment.",
      );
    }
    gymApiKey = key;
  }

  // Create the Xendit payment
  const xenditResult = await createGcashPayment({
    referenceId,
    amount,
    description,
    successReturnUrl: successUrl,
    failureReturnUrl: failureUrl,
    metadata: {
      userId,
      type,
      ...metadata,
    },
    apiKey: gymApiKey,
  });

  // Store payment record in database
  const payment = await subscriptionRepository.createXenditPayment({
    xenditPaymentId: xenditResult.paymentId,
    referenceId,
    userId: userId!,
    type,
    amount,
    status: "PENDING",
    channelCode: "GCASH",
    redirectUrl: xenditResult.redirectUrl,
    metadata: metadata || {},
  });

  return {
    kind: "ok",
    paymentId: payment.id,
    xenditPaymentId: xenditResult.paymentId,
    referenceId,
    redirectUrl: xenditResult.redirectUrl,
  };
}

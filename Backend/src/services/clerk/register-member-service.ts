import { ClerkRepository } from "@/repositories/clerk.repository";
import { MembershipRepository } from "@/repositories/membership.repository";
import { UserRepository } from "@/repositories/user.repository";
import { hashPassword } from "@/utils/hash";
import { EmitSalesUpdatedService as emitSalesUpdated } from "@/services/realtime/emit-sales-updated-service";
import { NotifyMembershipChangeService as notifyMembershipChange } from "@/services/membership/notify-membership-change-service";
import type { RegisteredBy } from "@/types/membership";

const clerkRepository = new ClerkRepository();
const membershipRepository = new MembershipRepository();
const userRepository = new UserRepository();

type RegisterMemberResult =
  | { kind: "error"; status: number; message: string }
  | {
      kind: "ok";
      membership: Awaited<ReturnType<ClerkRepository["registerMemberAndSale"]>>;
    };

/**
 * POST /api/clerk/members — register a walk-in member and log the cash sale
 * in ONE atomic unit (membership row + clerk transaction).
 */
export async function RegisterMemberService(input: {
  gymId: string;
  clerkId: string;
  firstName?: any;
  lastName?: any;
  email?: any;
  planId?: any;
}): Promise<RegisterMemberResult> {
  const { gymId, clerkId, firstName, lastName, email, planId } = input;

  const plan = await membershipRepository.findActiveByIdAndGym(planId, gymId);
  if (!plan) {
    return { kind: "error", status: 404, message: "Plan not found" };
  }

  // Check if user exists or create placeholder
  let user = email
    ? await userRepository.findByEmail(email.toLowerCase())
    : null;

  if (!user) {
    user = await userRepository.createUser({
      fullName: `${firstName} ${lastName}`.trim(),
      email: email?.toLowerCase() || `walkin-${Date.now()}@fitfinder.local`,
      passwordHash: await hashPassword("temppass123"),
      role: "USER",
      emailVerified: true,
    });
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + plan.durationDays);

  const actor = await userRepository.findRoleById(clerkId);
  const registeredBy: RegisteredBy =
    actor?.role === "OWNER" ? "OWNER" : "CLERK";

  const membership = await clerkRepository.registerMemberAndSale({
    membership: {
      userId: user.id,
      gymId,
      planId: plan.id,
      planName: plan.name,
      planPrice: plan.price,
      durationDays: plan.durationDays,
      paymentMethod: "CASH",
      paymentRef: `CLERK-${Date.now()}`,
      totalPaid: plan.price,
      memberType: "WALK_IN",
      registeredBy,
      registeredById: clerkId,
      expiresAt,
    },
    transaction: {
      gymId,
      clerkId,
      type: "MONTHLY",
      memberName: `${firstName} ${lastName}`.trim(),
      amount: plan.price,
      method: "CASH",
      notes: `New ${plan.name.toLowerCase()} registration`,
    },
  });

  await notifyMembershipChange(user.id, gymId);
  void emitSalesUpdated(gymId);

  return { kind: "ok", membership };
}

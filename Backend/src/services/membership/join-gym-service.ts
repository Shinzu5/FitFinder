import { GymRepository } from "@/repositories/gym.repository";
import { MembershipRepository } from "@/repositories/membership.repository";
import { CatalogRepository } from "@/repositories/catalog.repository";
import { UserRepository } from "@/repositories/user.repository";
import { ApprovalRepository } from "@/repositories/approval.repository";
import { CreatePendingApprovalService as createPendingApproval } from "@/services/membership/create-pending-approval-service";
import { ShapeApprovalPayloadService as shapeApprovalPayload } from "@/services/membership/shape-approval-payload-service";

const gymRepository = new GymRepository();
const membershipRepository = new MembershipRepository();
const catalogRepository = new CatalogRepository();
const userRepository = new UserRepository();
const approvalRepository = new ApprovalRepository();

type JoinGymInput = {
  userId: string;
  gymId?: string;
  planId?: string;
  coachId?: string;
  paymentMethod?: string;
  paymentRef?: string;
  totalPaid?: number;
};

type ShapedApproval = ReturnType<typeof shapeApprovalPayload>;

type JoinGymResult =
  | { kind: "error"; status: number; message: string }
  | { kind: "pending"; approval: ShapedApproval; assignedTo: string; message: string }
  | { kind: "approved"; approval: ShapedApproval; assignedTo: string; message: string }
  | {
      kind: "created";
      approval: ShapedApproval;
      assignedTo: string;
      isRenewal: boolean;
      message: string;
    };

/**
 * POST /api/user/join-gym — walk-in join / renewal request.
 * Validates the payload, resolves gym + plan + coach, reuses any open request.
 */
export async function JoinGymService(input: JoinGymInput): Promise<JoinGymResult> {
  const { userId, gymId, planId, coachId, paymentMethod, paymentRef, totalPaid } = input;

  if (!gymId || !paymentMethod) {
    return {
      kind: "error",
      status: 400,
      message: "gymId and paymentMethod are required",
    };
  }

  if (paymentMethod !== "walk-in") {
    return {
      kind: "error",
      status: 400,
      message:
        "Cashless memberships must be paid via Xendit GCash. Use the GCash payment flow.",
    };
  }

  const gym = await gymRepository.findByIdWithJoinInfo(gymId);
  if (!gym || gym.status !== "ACTIVE") {
    return { kind: "error", status: 404, message: "Gym not found" };
  }

  // Renewal only while a live membership still exists at this gym — multi-gym allowed
  const existingAtGym = await membershipRepository.findLiveSnapshotByUserAndGym(
    userId,
    gymId,
  );
  const isRenewal = Boolean(existingAtGym);

  const user = await userRepository.findContactSummaryById(userId);
  if (!user) {
    return { kind: "error", status: 404, message: "User not found" };
  }

  // Resolve plan: active id → gym's first active plan → auto-create Monthly
  let plan = planId
    ? await membershipRepository.findActiveByIdAndGym(planId, gymId)
    : null;

  if (planId && !plan) {
    return {
      kind: "error",
      status: 400,
      message: "This membership plan is no longer available",
    };
  }

  if (!plan) {
    plan = gym.membershipPlans[0] ?? null;
  }

  if (!plan) {
    return { kind: "error", status: 400, message: "No membership plans available." };
  }

  let coach = null;
  if (coachId) {
    coach = await catalogRepository.findActiveCoachByIdAndGym(coachId, gymId);
    if (!coach) {
      return {
        kind: "error",
        status: 400,
        message:
          "Selected coach is no longer available. Please choose another coach or continue without one.",
      };
    }
  }

  const assignedTo = gym.clerks.length > 0 ? "CLERK" : "OWNER";

  // Idempotent pending
  const pendingApproval = await approvalRepository.findPendingByUserAndGym(
    userId,
    gymId,
  );
  if (pendingApproval) {
    return {
      kind: "pending",
      approval: shapeApprovalPayload(pendingApproval, gym.name),
      assignedTo,
      message: isRenewal
        ? "You already have a pending renewal request"
        : "You already have a pending walk-in request",
    };
  }

  const approvedOpen = await approvalRepository.findApprovedOpenByUserAndGym(
    userId,
    gymId,
  );
  if (approvedOpen) {
    return {
      kind: "approved",
      approval: shapeApprovalPayload(approvedOpen, gym.name),
      assignedTo,
      message: "Your walk-in request was approved. Click Done to continue.",
    };
  }

  const ref = String(paymentRef || `WI-${Date.now()}`).trim();
  const amount = Number(totalPaid) || plan.price + (coach?.sessionPrice || 0);

  const { shaped } = await createPendingApproval({
    userId,
    gymId,
    planId: plan.id,
    planName: plan.name,
    planPrice: plan.price,
    memberName: user.fullName,
    memberEmail: user.email,
    coachId: coach?.id || null,
    coachName: coach?.name || null,
    coachSessionPrice: coach?.sessionPrice || 0,
    paymentRef: ref,
    totalPaid: amount,
    durationDays: plan.durationDays,
    isRenewal,
    paymentMethod: "WALK_IN",
  });

  return {
    kind: "created",
    approval: shaped,
    assignedTo,
    isRenewal,
    message: isRenewal
      ? "Renewal payment recorded — waiting for Owner/Clerk approval"
      : "Walk-in payment recorded — waiting for Owner/Clerk approval",
  };
}

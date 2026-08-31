import { useMembershipStore } from "@/stores/membership-store";
import { useWalkInApprovalsStore } from "@/stores/walk-in-approvals-store";
import { useAuthStore } from "@/stores/auth-store";

/** Per-gym access lifecycle for multi-gym gymers. */
export type GymAccessStatus =
  | "none"
  | "pending"
  | "approved"
  | "active"
  | "expired";

function latestOpenRequest(gymId: string, userId: string | undefined) {
  if (!userId) return null;
  const requests = useWalkInApprovalsStore.getState().requests;
  return (
    requests
      .filter(
        (req) =>
          req.userId === userId &&
          req.gymId === gymId &&
          !req.consumedAt &&
          (req.status === "pending" || req.status === "approved"),
      )
      .sort((a, b) => b.submittedAt - a.submittedAt)[0] ?? null
  );
}

/**
 * Resolve independent membership access for one gym.
 * LIVE Neon membership → active/expired; open WalkInApproval → pending/approved.
 */
export function resolveGymAccessStatus(gymId: string): GymAccessStatus {
  if (!gymId) return "none";

  const { memberships, enrolledGymIds, joinedGymId, membership } =
    useMembershipStore.getState();
  const userId = useAuthStore.getState().user?.id;

  const enrolled = memberships.find((m) => m.gymId === gymId);
  if (enrolled) {
    const status = String(enrolled.status || "").toLowerCase();
    if (status === "expired" || enrolled.remainingDays <= 0) return "expired";
    return "active";
  }

  // Active session membership for this gym (fetchMembership shape)
  if (
    (joinedGymId === gymId || membership?.gymId === gymId) &&
    enrolledGymIds.includes(gymId)
  ) {
    return "active";
  }

  const open = latestOpenRequest(gymId, userId);
  if (open?.status === "pending") return "pending";
  if (open?.status === "approved") return "approved";

  return "none";
}

/** True when this gym has a live (usable) membership. */
export function hasLiveAccessToGym(gymId: string): boolean {
  return resolveGymAccessStatus(gymId) === "active";
}

/** Extract /dashboard/user/gym/:gymId from a pathname. */
export function gymIdFromUserPath(pathname: string): string | null {
  const match = pathname.match(/^\/dashboard\/user\/gym\/([^/]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

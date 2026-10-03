import { ApprovalRepository } from "@/repositories/approval.repository";
import { MembershipRepository } from "@/repositories/membership.repository";
import { ResolveActiveGymService as resolveActiveGymId } from "@/services/gym/resolve-active-gym-service";
import { ListLiveMembershipsService as listLiveMemberships } from "@/services/gym/list-live-memberships-service";

const approvalRepository = new ApprovalRepository();
const membershipRepository = new MembershipRepository();

type GetMembershipResult =
  | {
      activeGymId: null;
      membership: null;
      renewals: [];
      live: [];
    }
  | {
      activeGymId: string;
      membership: null;
      renewals: [];
      live: [];
    }
  | {
      activeGymId: string;
      membership: NonNullable<
        Awaited<ReturnType<MembershipRepository["findLiveByUserAndGymWithRelations"]>>
      >;
      renewals: Awaited<ReturnType<ApprovalRepository["listRenewalsByUserAndGym"]>>;
      live: Awaited<ReturnType<typeof listLiveMemberships>>;
    };

/**
 * GET /api/user/membership — currently selected gym membership with
 * renewal history and the enrolled-gym switcher ids.
 */
export async function GetMembershipService(userId: string): Promise<GetMembershipResult> {
  const activeGymId = await resolveActiveGymId(userId);
  if (!activeGymId) {
    return { activeGymId: null, membership: null, renewals: [], live: [] };
  }

  const membership = await membershipRepository.findLiveByUserAndGymWithRelations(
    userId,
    activeGymId,
  );

  if (!membership) {
    return { activeGymId, membership: null, renewals: [], live: [] };
  }

  const renewals = await approvalRepository.listRenewalsByUserAndGym(
    userId,
    membership.gymId,
  );

  const live = await listLiveMemberships(userId);

  return { activeGymId, membership, renewals, live };
}

import type { MembershipStatus } from "@prisma/client";
import { MembershipRepository } from "@/repositories/membership.repository";
import type { MemberType, RegisteredBy } from "@/types/membership";

type UpsertMembershipInput = {
  userId: string;
  gymId: string;
  planId?: string | null;
  planName: string;
  planPrice: number;
  durationDays: number;
  coachId?: string | null;
  paymentMethod: string;
  paymentRef: string;
  totalPaid: number;
  memberType: MemberType;
  registeredBy: RegisteredBy;
  registeredById?: string | null;
  expiresAt: Date;
  startsAt?: Date;
  status?: MembershipStatus;
};

const membershipRepository = new MembershipRepository();

/**
 * One membership row per user+gym — update existing instead of duplicating.
 */
export async function UpsertGymMembershipService(
  data: UpsertMembershipInput & { accumulateTotalPaid?: boolean },
) {
  return membershipRepository.upsertGymMembershipRow(data);
}

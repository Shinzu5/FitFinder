import type { MembershipStatus } from "@prisma/client";

export type UpsertGymMembershipRowInput = {
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
  memberType: "WALK_IN" | "ONLINE";
  registeredBy: "OWNER" | "CLERK" | "SELF";
  registeredById?: string | null;
  expiresAt: Date;
  startsAt?: Date;
  status?: MembershipStatus;
  accumulateTotalPaid?: boolean;
};

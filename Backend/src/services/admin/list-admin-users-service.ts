import { AdminRepository } from "@/repositories/admin.repository";

const adminRepository = new AdminRepository();

/**
 * GET /api/admin/users — user list with clerk-gym summary, plus the data the
 * status column needs (overdue memberships marked expired first).
 */
export async function ListAdminUsersService(role?: any) {
  const where: any = {};
  if (role && typeof role === "string") {
    where.role = role.toUpperCase();
  }

  const users = await adminRepository.listUsers(where);

  const now = new Date();
  const ownerIds = users.filter((u) => u.role === "OWNER").map((u) => u.id);
  const gymerIds = users.filter((u) => u.role === "USER").map((u) => u.id);

  // Mark overdue gym memberships expired before status checks
  if (gymerIds.length > 0) {
    await adminRepository.expireOverdueMembershipsByUserIds(gymerIds, now);
  }

  const [activeMemberships, ownerSubscriptions] = await Promise.all([
    gymerIds.length
      ? adminRepository.listLiveMembershipUserIds(gymerIds, now)
      : Promise.resolve([]),
    ownerIds.length
      ? adminRepository.listOwnerSubscriptionsByOwners(ownerIds)
      : Promise.resolve([]),
  ]);

  const activeMemberSet = new Set(activeMemberships.map((m) => m.userId));
  const latestOwnerSub = new Map<string, Date>();
  for (const sub of ownerSubscriptions) {
    if (!latestOwnerSub.has(sub.ownerId)) {
      latestOwnerSub.set(sub.ownerId, sub.validUntil);
    }
  }

  return { users, activeMemberSet, latestOwnerSub, now };
}

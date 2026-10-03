import { AdminRepository } from "@/repositories/admin.repository";

const adminRepository = new AdminRepository();

/**
 * GET /api/admin/users/:id — profile + gym membership history for View modal
 * (overdue memberships marked expired first).
 */
export async function GetAdminUserDetailService(userId: string) {
  const user = await adminRepository.findUserDetail(userId);
  if (!user) {
    return { user: null as null };
  }

  const now = new Date();
  await adminRepository.expireOverdueMembershipByUser(userId, now);

  const [memberships, approvals] = await Promise.all([
    adminRepository.listMembershipsForUser(userId),
    adminRepository.listApprovalsForUser(userId),
  ]);

  return { user, memberships, approvals, now };
}

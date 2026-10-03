import { AdminRepository } from "@/repositories/admin.repository";
import {
  HealOwnerSubscriptionDurationsService as healOwnerSubscriptionDurations,
  SyncLatestOwnerSubscriptionsService as syncLatestOwnerSubscriptions,
} from "@/services/subscription";

const adminRepository = new AdminRepository();

/**
 * GET /api/admin/gyms — active gyms + latest owner plan (accurate DB data).
 * Pending gyms auto-activated; subscription rows synced and durations healed.
 */
export async function ListAdminGymsService() {
  await adminRepository.activatePendingGyms();

  // Ensure subscription rows exist and durations match purchased plan days
  try {
    await syncLatestOwnerSubscriptions();
    await healOwnerSubscriptionDurations();
  } catch (healError) {
    console.error("Admin gyms subscription sync failed:", healError);
  }

  const gyms = await adminRepository.listActiveGymsWithOwnerAndMembers();

  const ownerIds = [...new Set(gyms.map((g) => g.ownerId))];

  // Latest purchase per owner (by paidAt) — source of truth for plan + days left
  const subscriptions = ownerIds.length
    ? await adminRepository.listOwnerSubscriptionsFullByOwners(ownerIds)
    : [];

  const latestByOwnerId = new Map<string, (typeof subscriptions)[number]>();
  for (const sub of subscriptions) {
    if (!latestByOwnerId.has(sub.ownerId)) {
      latestByOwnerId.set(sub.ownerId, sub);
    }
  }

  // Pending owner-plan Xendit payments (no OwnerSubscription yet)
  const pendingPayments = ownerIds.length
    ? await adminRepository.listPendingSubscriptionOwners(ownerIds)
    : [];
  const pendingOwnerSet = new Set(pendingPayments.map((p) => p.userId));

  const now = new Date();

  return { gyms, latestByOwnerId, pendingOwnerSet, now };
}

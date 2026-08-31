import prisma from "../config/database";
import { daysRemainingUntil } from "../utils/ownerPlan";
import {
  createNotification,
  daysRemainingUntilDate,
  getUnreadNotificationCount,
  upsertLiveNotification,
} from "./notification.service";
import { expireOverdueMemberships } from "./membershipAccess.service";
import { emitToUser } from "../socket";

const MEMBERSHIP_REMINDER_DAYS = [7, 3, 1] as const;

/**
 * Membership expiry reminders (7/3/1 days) + revoke overdue access with notify.
 * Owner plan: live 5-day countdown until renewed or expired.
 */
export async function runNotificationJobs(): Promise<void> {
  try {
    await sendMembershipExpiryReminders();
  } catch (error) {
    console.error("Membership expiry reminders failed:", error);
  }

  try {
    const expired = await expireOverdueMemberships();
    if (expired > 0) {
      // expireOverdueMemberships notifies via hook in membershipAccess
    }
  } catch (error) {
    console.error("expireOverdueMemberships failed:", error);
  }

  try {
    await syncOwnerPlanExpiryNotifications();
  } catch (error) {
    console.error("Owner plan expiry notifications failed:", error);
  }
}

async function sendMembershipExpiryReminders(): Promise<void> {
  const now = new Date();
  const memberships = await prisma.gymMembership.findMany({
    where: {
      status: { in: ["ACTIVE", "EXPIRING"] },
      expiresAt: { gt: now },
    },
    select: {
      id: true,
      userId: true,
      gymId: true,
      expiresAt: true,
      gym: { select: { name: true } },
    },
  });

  for (const m of memberships) {
    const daysLeft = daysRemainingUntilDate(m.expiresAt, now);
    if (!MEMBERSHIP_REMINDER_DAYS.includes(daysLeft as 7 | 3 | 1)) continue;

    await createNotification({
      userId: m.userId,
      type: "MEMBERSHIP_EXPIRING",
      title: "Membership expiring soon",
      body: "Your membership will expire soon. Renew to avoid losing access.",
      data: {
        membershipId: m.id,
        gymId: m.gymId,
        gymName: m.gym.name,
        daysLeft,
        expiresAt: m.expiresAt.toISOString(),
      },
      dedupeKey: `membership_expiring:${m.id}:${daysLeft}`,
    });
  }
}

/**
 * Keep a live owner-plan notification while daysLeft is 1–5.
 * At 5 days: create with required copy. As days drop, update body in realtime.
 * At 0: mark expired once.
 */
async function syncOwnerPlanExpiryNotifications(): Promise<void> {
  const now = new Date();

  // Latest subscription per owner
  const subs = await prisma.ownerSubscription.findMany({
    orderBy: { validUntil: "desc" },
    select: {
      id: true,
      ownerId: true,
      gymId: true,
      planName: true,
      validUntil: true,
    },
  });

  const latestByOwner = new Map<string, (typeof subs)[number]>();
  for (const sub of subs) {
    if (!latestByOwner.has(sub.ownerId)) {
      latestByOwner.set(sub.ownerId, sub);
    }
  }

  for (const sub of latestByOwner.values()) {
    const daysLeft = daysRemainingUntil(sub.validUntil, now);
    const liveKey = `owner_plan_live:${sub.ownerId}`;

    if (daysLeft > 5) {
      // Renewed or still healthy — clear live countdown tracking by marking read
      const cleared = await prisma.notification.updateMany({
        where: {
          userId: sub.ownerId,
          dedupeKey: liveKey,
          readAt: null,
        },
        data: { readAt: now },
      });
      if (cleared.count > 0) {
        const unreadCount = await getUnreadNotificationCount(sub.ownerId);
        emitToUser(sub.ownerId, "notifications_updated", { unreadCount });
      }
      continue;
    }

    if (daysLeft >= 1 && daysLeft <= 5) {
      const body =
        daysLeft === 5
          ? "Your gym subscription expires in 5 days. Renew to keep your gym active."
          : `Your gym subscription expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}. Renew to keep your gym active.`;

      await upsertLiveNotification({
        userId: sub.ownerId,
        type: "OWNER_PLAN_EXPIRING",
        title: "Gym subscription expiring",
        body,
        data: {
          subscriptionId: sub.id,
          gymId: sub.gymId,
          planName: sub.planName,
          daysLeft,
          validUntil: sub.validUntil.toISOString(),
        },
        dedupeKey: liveKey,
      });
      continue;
    }

    // daysLeft === 0 → expired
    if (daysLeft === 0) {
      await createNotification({
        userId: sub.ownerId,
        type: "OWNER_PLAN_EXPIRED",
        title: "Gym subscription expired",
        body: "Your gym subscription has expired. Renew to keep your gym active.",
        data: {
          subscriptionId: sub.id,
          gymId: sub.gymId,
          planName: sub.planName,
          daysLeft: 0,
          validUntil: sub.validUntil.toISOString(),
        },
        dedupeKey: `owner_plan_expired:${sub.id}`,
      });

      // Close out the live countdown notification
      await prisma.notification.updateMany({
        where: { userId: sub.ownerId, dedupeKey: liveKey, readAt: null },
        data: { readAt: now },
      });
    }
  }
}

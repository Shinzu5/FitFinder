import { Prisma } from "@prisma/client";
import prisma from "@/config/database";

/**
 * Notification CRUD mirroring notification.service.ts / notificationJobs.service.ts
 * query shapes (dedupe on dedupeKey, unread counts, live countdown updates).
 */
export class NotificationRepository {
  // ─── Generic passthroughs ───────────────────────────────────────────────────

  async findNotifications(
    args: Prisma.NotificationFindManyArgs,
  ) {
    return prisma.notification.findMany(args);
  }

  async findNotification(
    args: Prisma.NotificationFindFirstArgs,
  ) {
    return prisma.notification.findFirst(args);
  }

  async updateNotifications(
    args: Prisma.NotificationUpdateManyArgs,
  ) {
    return prisma.notification.updateMany(args);
  }

  // ─── Named queries (1:1 with notification.service) ──────────────────────────

  /** Unread badge count for a user. */
  async countUnread(userId: string) {
    return prisma.notification.count({ where: { userId, readAt: null } });
  }

  /** Dedupe probe by unique dedupeKey. */
  async findByDedupeKey(dedupeKey: string) {
    return prisma.notification.findUnique({ where: { dedupeKey } });
  }

  async create(data: Prisma.NotificationCreateArgs["data"]) {
    return prisma.notification.create({ data });
  }

  async updateById(id: string, data: Record<string, unknown>) {
    return prisma.notification.update({ where: { id }, data });
  }

  /** Ownership check before marking read. */
  async findForUser(id: string, userId: string) {
    return prisma.notification.findFirst({ where: { id, userId } });
  }

  /** Recent notifications for a user (newest first). */
  async listRecent(userId: string, limit: number) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  /** Recent unread notifications for a user (newest first). */
  async listRecentUnread(userId: string, limit: number) {
    return prisma.notification.findMany({
      where: { userId, readAt: null },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  async markRead(id: string, readAt: Date) {
    return prisma.notification.update({ where: { id }, data: { readAt } });
  }

  /** Mark every unread notification of a user as read. */
  async markAllRead(userId: string, readAt: Date) {
    return prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt },
    });
  }

  /**
   * Close out a live countdown notification (owner_plan_live:*) by marking it
   * read — used by notificationJobs and payment activation.
   */
  async markLiveCountdownRead(
    userId: string,
    dedupeKey: string,
    readAt: Date,
  ) {
    return prisma.notification.updateMany({
      where: { userId, dedupeKey, readAt: null },
      data: { readAt },
    });
  }
}

import { Prisma } from "@prisma/client";
import prisma from "../config/database";

export type Tx = typeof prisma | Prisma.TransactionClient;

/**
 * Notification CRUD mirroring notification.service.ts / notificationJobs.service.ts
 * query shapes (dedupe on dedupeKey, unread counts, live countdown updates).
 */
export class NotificationRepository {
  // ─── Generic passthroughs ───────────────────────────────────────────────────

  async findNotifications(
    args: Prisma.NotificationFindManyArgs,
    tx: Tx = prisma,
  ) {
    return tx.notification.findMany(args);
  }

  async findNotification(
    args: Prisma.NotificationFindFirstArgs,
    tx: Tx = prisma,
  ) {
    return tx.notification.findFirst(args);
  }

  async updateNotifications(
    args: Prisma.NotificationUpdateManyArgs,
    tx: Tx = prisma,
  ) {
    return tx.notification.updateMany(args);
  }

  // ─── Named queries (1:1 with notification.service) ──────────────────────────

  /** Unread badge count for a user. */
  async countUnread(userId: string, tx: Tx = prisma) {
    return tx.notification.count({ where: { userId, readAt: null } });
  }

  /** Dedupe probe by unique dedupeKey. */
  async findByDedupeKey(dedupeKey: string, tx: Tx = prisma) {
    return tx.notification.findUnique({ where: { dedupeKey } });
  }

  async create(data: Prisma.NotificationCreateArgs["data"], tx: Tx = prisma) {
    return tx.notification.create({ data });
  }

  async updateById(id: string, data: Record<string, unknown>, tx: Tx = prisma) {
    return tx.notification.update({ where: { id }, data });
  }

  /** Ownership check before marking read. */
  async findForUser(id: string, userId: string, tx: Tx = prisma) {
    return tx.notification.findFirst({ where: { id, userId } });
  }

  /** Recent notifications for a user (newest first). */
  async listRecent(userId: string, limit: number, tx: Tx = prisma) {
    return tx.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  /** Recent unread notifications for a user (newest first). */
  async listRecentUnread(userId: string, limit: number, tx: Tx = prisma) {
    return tx.notification.findMany({
      where: { userId, readAt: null },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  async markRead(id: string, readAt: Date, tx: Tx = prisma) {
    return tx.notification.update({ where: { id }, data: { readAt } });
  }

  /** Mark every unread notification of a user as read. */
  async markAllRead(userId: string, readAt: Date, tx: Tx = prisma) {
    return tx.notification.updateMany({
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
    tx: Tx = prisma,
  ) {
    return tx.notification.updateMany({
      where: { userId, dedupeKey, readAt: null },
      data: { readAt },
    });
  }
}

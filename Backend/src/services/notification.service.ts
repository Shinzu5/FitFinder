import type { Prisma } from "@prisma/client";
import prisma from "../config/database";
import { emitToUser } from "../socket";

export type NotificationType =
  | "MEMBERSHIP_EXPIRING"
  | "MEMBERSHIP_EXPIRED"
  | "OWNER_PLAN_EXPIRING"
  | "OWNER_PLAN_EXPIRED"
  | "MESSAGE"
  | "MEMBERSHIP_REQUEST_SUBMITTED"
  | "MEMBERSHIP_APPROVED"
  | "MEMBERSHIP_REJECTED"
  | "MEMBERSHIP_RENEWED"
  | "MEMBERSHIP_REQUEST_NEW"
  | "MEMBERSHIP_RENEWAL_REQUEST"
  | "PAYMENT_CONFIRMATION";

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType | string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  /** When set, skips create if a row with this key already exists */
  dedupeKey?: string | null;
}

function serializeNotification(n: {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data: unknown;
  dedupeKey?: string | null;
  readAt: Date | null;
  createdAt: Date;
  updatedAt?: Date;
}) {
  return {
    id: n.id,
    userId: n.userId,
    type: n.type,
    title: n.title,
    body: n.body,
    data: (n.data && typeof n.data === "object" ? n.data : {}) as Record<string, unknown>,
    dedupeKey: n.dedupeKey ?? null,
    readAt: n.readAt ? n.readAt.toISOString() : null,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt ? n.updatedAt.toISOString() : n.createdAt.toISOString(),
    isRead: Boolean(n.readAt),
  };
}

export type SerializedNotification = ReturnType<typeof serializeNotification>;

function emitNotificationEvents(
  userId: string,
  notification: SerializedNotification,
  unreadCount: number,
): void {
  emitToUser(userId, "notification", { notification, unreadCount });
  emitToUser(userId, "notifications_updated", { unreadCount });
}

async function unreadCountFor(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, readAt: null },
  });
}

/** Persist a notification and push it over Socket.IO. Dedupes on dedupeKey. */
export async function createNotification(
  input: CreateNotificationInput,
): Promise<SerializedNotification | null> {
  const { userId, type, title, body, data = {}, dedupeKey = null } = input;
  if (!userId) return null;

  if (dedupeKey) {
    const existing = await prisma.notification.findUnique({
      where: { dedupeKey },
    });
    if (existing) {
      return serializeNotification(existing);
    }
  }

  try {
    const created = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        body,
        data: data as Prisma.InputJsonValue,
        dedupeKey: dedupeKey || null,
      },
    });

    const serialized = serializeNotification(created);
    const unreadCount = await unreadCountFor(userId);
    emitNotificationEvents(userId, serialized, unreadCount);
    return serialized;
  } catch (error: unknown) {
    // Unique race on dedupeKey — return existing
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: string }).code)
        : "";
    if (code === "P2002" && dedupeKey) {
      const existing = await prisma.notification.findUnique({
        where: { dedupeKey },
      });
      return existing ? serializeNotification(existing) : null;
    }
    console.error("createNotification failed:", error);
    return null;
  }
}

/** Update body/data of an existing notification (by dedupeKey) and re-emit. */
export async function upsertLiveNotification(input: {
  userId: string;
  type: NotificationType | string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  dedupeKey: string;
}): Promise<SerializedNotification | null> {
  const { userId, type, title, body, data = {}, dedupeKey } = input;

  const existing = await prisma.notification.findUnique({ where: { dedupeKey } });
  if (existing) {
    const updated = await prisma.notification.update({
      where: { id: existing.id },
      data: {
        title,
        body,
        data: data as Prisma.InputJsonValue,
        type,
        // Keep unread so the owner keeps seeing live countdown updates
        readAt: null,
      },
    });
    const serialized = serializeNotification(updated);
    const unreadCount = await unreadCountFor(userId);
    emitNotificationEvents(userId, serialized, unreadCount);
    return serialized;
  }

  return createNotification({ userId, type, title, body, data, dedupeKey });
}

export async function createNotificationsForUsers(
  userIds: string[],
  payload: Omit<CreateNotificationInput, "userId">,
): Promise<void> {
  const unique = [...new Set(userIds.filter(Boolean))];
  await Promise.all(
    unique.map((userId) =>
      createNotification({
        ...payload,
        userId,
        dedupeKey: payload.dedupeKey ? `${payload.dedupeKey}:${userId}` : null,
      }),
    ),
  );
}

/** Owner + clerks assigned to a gym. */
export async function notifyGymStaff(
  gymId: string,
  payload: Omit<CreateNotificationInput, "userId" | "dedupeKey"> & {
    dedupeKeyPrefix: string;
  },
): Promise<void> {
  const [gym, clerks] = await Promise.all([
    prisma.gym.findUnique({ where: { id: gymId }, select: { ownerId: true } }),
    prisma.user.findMany({
      where: { clerkGymId: gymId, role: "CLERK" },
      select: { id: true },
    }),
  ]);

  const ids = [
    ...(gym?.ownerId ? [gym.ownerId] : []),
    ...clerks.map((c) => c.id),
  ];

  await createNotificationsForUsers(ids, {
    type: payload.type,
    title: payload.title,
    body: payload.body,
    data: { ...(payload.data || {}), gymId },
    dedupeKey: payload.dedupeKeyPrefix,
  });
}

export async function listNotifications(
  userId: string,
  opts?: { limit?: number; unreadOnly?: boolean },
): Promise<{ notifications: SerializedNotification[]; unreadCount: number }> {
  const limit = Math.min(Math.max(opts?.limit ?? 50, 1), 100);
  const [rows, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: {
        userId,
        ...(opts?.unreadOnly ? { readAt: null } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    unreadCountFor(userId),
  ]);

  return {
    notifications: rows.map(serializeNotification),
    unreadCount,
  };
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  return unreadCountFor(userId);
}

export async function markNotificationRead(
  userId: string,
  notificationId: string,
): Promise<SerializedNotification | null> {
  const existing = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  });
  if (!existing) return null;

  const updated = existing.readAt
    ? existing
    : await prisma.notification.update({
        where: { id: existing.id },
        data: { readAt: new Date() },
      });

  const serialized = serializeNotification(updated);
  const unreadCount = await unreadCountFor(userId);
  emitToUser(userId, "notifications_updated", { unreadCount });
  emitToUser(userId, "notification_read", { notification: serialized, unreadCount });
  return serialized;
}

export async function markAllNotificationsRead(userId: string): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  const unreadCount = 0;
  emitToUser(userId, "notifications_updated", { unreadCount });
  return result.count;
}

/** Whole calendar days remaining until expiresAt (inclusive of end day). */
export function daysRemainingUntilDate(expiresAt: Date, now = new Date()): number {
  const start = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const end = Date.UTC(
    expiresAt.getFullYear(),
    expiresAt.getMonth(),
    expiresAt.getDate(),
  );
  return Math.round((end - start) / (1000 * 60 * 60 * 24));
}

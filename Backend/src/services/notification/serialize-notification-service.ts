export function SerializeNotificationService(n: {
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

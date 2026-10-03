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

/** Serialized notification shape produced by SerializeNotificationService. */
export type SerializedNotification = {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  dedupeKey: string | null;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
  isRead: boolean;
};

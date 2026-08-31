"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { getSocket } from "@/lib/socket";
import {
  useNotificationsStore,
  type AppNotification,
} from "@/stores/notifications-store";

interface NotificationPayload {
  notification: AppNotification;
  unreadCount: number;
}

interface NotificationsUpdatedPayload {
  unreadCount: number;
}

export function useNotificationsSocket() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const fetchUnreadCount = useNotificationsStore((s) => s.fetchUnreadCount);
  const prependFromSocket = useNotificationsStore((s) => s.prependFromSocket);
  const setUnreadCount = useNotificationsStore((s) => s.setUnreadCount);
  const reset = useNotificationsStore((s) => s.reset);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      reset();
      return;
    }

    void fetchUnreadCount();

    const socket = getSocket(accessToken);

    const onNotification = (payload: NotificationPayload) => {
      if (!payload?.notification) return;
      prependFromSocket(payload.notification, Number(payload.unreadCount) || 0);
    };

    const onUpdated = (payload: NotificationsUpdatedPayload) => {
      setUnreadCount(Number(payload?.unreadCount) || 0);
    };

    const onRead = (payload: NotificationPayload) => {
      if (typeof payload?.unreadCount === "number") {
        setUnreadCount(payload.unreadCount);
      }
      if (payload?.notification) {
        prependFromSocket(payload.notification, Number(payload.unreadCount) || 0);
      }
    };

    socket.on("notification", onNotification);
    socket.on("notifications_updated", onUpdated);
    socket.on("notification_read", onRead);

    return () => {
      socket.off("notification", onNotification);
      socket.off("notifications_updated", onUpdated);
      socket.off("notification_read", onRead);
    };
  }, [
    accessToken,
    isAuthenticated,
    fetchUnreadCount,
    prependFromSocket,
    setUnreadCount,
    reset,
  ]);
}

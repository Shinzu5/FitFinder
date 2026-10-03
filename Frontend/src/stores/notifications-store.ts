"use client";

import { create } from "zustand";
import api from "@/lib/api";

export interface AppNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
  updatedAt?: string;
  isRead: boolean;
}

interface NotificationsState {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  markingAll: boolean;
  open: boolean;
  fetchNotifications: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  setOpen: (open: boolean) => void;
  prependFromSocket: (notification: AppNotification, unreadCount: number) => void;
  setUnreadCount: (unreadCount: number) => void;
  reset: () => void;
}

function normalize(n: Partial<AppNotification> & { id: string }): AppNotification {
  return {
    id: n.id,
    userId: n.userId || "",
    type: n.type || "",
    title: n.title || "",
    body: n.body || "",
    data: (n.data && typeof n.data === "object" ? n.data : {}) as Record<string, unknown>,
    readAt: n.readAt ? String(n.readAt) : null,
    createdAt: n.createdAt || new Date().toISOString(),
    updatedAt: n.updatedAt,
    isRead: Boolean(n.isRead ?? n.readAt),
  };
}

/** Guards against stale list fetches clobbering optimistic read updates. */
let fetchGen = 0;

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  markingAll: false,
  open: false,

  fetchNotifications: async () => {
    const gen = ++fetchGen;
    set({ loading: true });
    try {
      const { data } = await api.get("/notifications");
      // A markAllRead/markRead happened while this fetch was in flight — drop stale result.
      if (gen !== fetchGen) return;
      const payload = data?.data || {};
      const list = Array.isArray(payload.notifications)
        ? payload.notifications.map(normalize)
        : [];
      set({
        notifications: list,
        unreadCount: Number(payload.unreadCount) || 0,
        loading: false,
      });
    } catch {
      if (gen !== fetchGen) return;
      set({ loading: false });
    }
  },

  fetchUnreadCount: async () => {
    const gen = ++fetchGen;
    try {
      const { data } = await api.get("/notifications/unread-count");
      // Drop stale count that would resurrect the badge after a mark-all.
      if (gen !== fetchGen) return;
      set({ unreadCount: Number(data?.data?.unreadCount) || 0 });
    } catch {
      // ignore
    }
  },

  markRead: async (id: string) => {
    fetchGen++;
    set((state) => ({
      unreadCount: Math.max(0, state.unreadCount - 1),
      notifications: state.notifications.map((n) =>
        n.id === id
          ? { ...n, isRead: true, readAt: n.readAt || new Date().toISOString() }
          : n,
      ),
    }));
    try {
      const { data } = await api.post(`/notifications/${id}/read`);
      const unreadCount = Number(data?.data?.unreadCount);
      if (!Number.isNaN(unreadCount)) {
        set({ unreadCount });
      }
      const returned = data?.data?.notification;
      if (returned?.id) {
        const normalized = normalize(returned);
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === normalized.id ? normalized : n,
          ),
        }));
      }
    } catch {
      void get().fetchUnreadCount();
    }
  },

  markAllRead: async () => {
    if (get().markingAll) return;
    // Invalidate any in-flight list fetch so it can't restore stale unread state.
    fetchGen++;
    set({ markingAll: true });
    set((state) => ({
      unreadCount: 0,
      notifications: state.notifications.map((n) => ({
        ...n,
        isRead: true,
        readAt: n.readAt || new Date().toISOString(),
      })),
    }));
    try {
      const { data } = await api.post("/notifications/read-all");
      const unreadCount = Number(data?.data?.unreadCount);
      set({
        unreadCount: Number.isNaN(unreadCount) ? 0 : unreadCount,
        markingAll: false,
      });
      // No background refetch here: server response is authoritative.
      // A refetch could resurrect the badge with a stale in-flight count.
    } catch (error) {
      console.error("Mark all read failed:", error);
      set({ markingAll: false });
      void get().fetchUnreadCount();
      void get().fetchNotifications();
    }
  },

  setOpen: (open) => {
    set({ open });
    if (open && get().notifications.length === 0) {
      void get().fetchNotifications();
    }
  },

  prependFromSocket: (notification, unreadCount) => {
    const normalized = normalize(notification);
    set((state) => {
      const without = state.notifications.filter((n) => n.id !== normalized.id);
      return {
        notifications: [normalized, ...without].slice(0, 50),
        unreadCount,
      };
    });
  },

  setUnreadCount: (unreadCount) =>
    set((state) => {
      // Server says zero unread (e.g. mark-all from another tab) — clear local dots too.
      if (unreadCount === 0 && state.notifications.some((n) => !n.isRead)) {
        return {
          unreadCount: 0,
          notifications: state.notifications.map((n) => ({
            ...n,
            isRead: true,
            readAt: n.readAt || new Date().toISOString(),
          })),
        };
      }
      return { unreadCount };
    }),

  reset: () =>
    set({
      notifications: [],
      unreadCount: 0,
      loading: false,
      markingAll: false,
      open: false,
    }),
}));

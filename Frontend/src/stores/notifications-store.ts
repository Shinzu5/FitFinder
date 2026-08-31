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
    readAt: n.readAt ?? null,
    createdAt: n.createdAt || new Date().toISOString(),
    updatedAt: n.updatedAt,
    isRead: Boolean(n.isRead ?? n.readAt),
  };
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  open: false,

  fetchNotifications: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get("/notifications");
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
      set({ loading: false });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const { data } = await api.get("/notifications/unread-count");
      set({ unreadCount: Number(data?.data?.unreadCount) || 0 });
    } catch {
      // ignore
    }
  },

  markRead: async (id: string) => {
    try {
      const { data } = await api.post(`/notifications/${id}/read`);
      const unreadCount = Number(data?.data?.unreadCount) || 0;
      const updated = data?.data?.notification
        ? normalize(data.data.notification)
        : null;
      set((state) => ({
        unreadCount,
        notifications: state.notifications.map((n) =>
          n.id === id
            ? updated || { ...n, isRead: true, readAt: n.readAt || new Date().toISOString() }
            : n,
        ),
      }));
    } catch {
      // ignore
    }
  },

  markAllRead: async () => {
    try {
      await api.post("/notifications/read-all");
      set((state) => ({
        unreadCount: 0,
        notifications: state.notifications.map((n) => ({
          ...n,
          isRead: true,
          readAt: n.readAt || new Date().toISOString(),
        })),
      }));
    } catch {
      // ignore
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

  setUnreadCount: (unreadCount) => set({ unreadCount }),

  reset: () =>
    set({
      notifications: [],
      unreadCount: 0,
      loading: false,
      open: false,
    }),
}));

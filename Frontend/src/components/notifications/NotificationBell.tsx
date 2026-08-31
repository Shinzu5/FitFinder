"use client";

import { useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import { useNotificationsStore } from "@/stores/notifications-store";

function formatTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Drop-in for existing header Bell buttons — same look, wired to Neon + Socket.IO. */
export function NotificationBell({
  buttonClassName = "rounded-full border border-white/10 p-2 text-zinc-300 transition hover:text-white",
}: {
  buttonClassName?: string;
}) {
  const {
    open,
    setOpen,
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markRead,
    markAllRead,
  } = useNotificationsStore();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    void fetchNotifications();

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open, fetchNotifications, setOpen]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className={`relative ${buttonClassName}`}
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#FFD700] px-1 text-[10px] font-bold text-black">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-white/10 bg-zinc-950 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
            <p className="text-sm font-semibold text-white">Notifications</p>
            {unreadCount > 0 ? (
              <button
                type="button"
                className="text-xs text-zinc-400 transition hover:text-white"
                onClick={() => void markAllRead()}
              >
                Mark all read
              </button>
            ) : null}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-zinc-500">Loading…</p>
            ) : notifications.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-zinc-500">
                No notifications yet
              </p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className={`block w-full border-b border-white/5 px-3 py-2.5 text-left transition hover:bg-white/5 ${
                    n.isRead ? "opacity-70" : ""
                  }`}
                  onClick={() => {
                    if (!n.isRead) void markRead(n.id);
                  }}
                >
                  <div className="flex items-start gap-2">
                    {!n.isRead ? (
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#FFD700]" />
                    ) : (
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">{n.title}</p>
                      <p className="mt-0.5 text-xs leading-snug text-zinc-400">{n.body}</p>
                      <p className="mt-1 text-[10px] text-zinc-600">
                        {formatTime(n.createdAt)}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

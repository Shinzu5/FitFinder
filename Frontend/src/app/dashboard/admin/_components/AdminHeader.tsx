"use client";

import { usePathname } from "next/navigation";
import { ADMIN_NAV_ITEMS } from "./AdminSidebar";
import { AdminProfileMenu } from "./AdminProfileMenu";
import { NotificationBell } from "@/components/notifications/NotificationBell";

function getPageTitle(pathname: string) {
  const match = ADMIN_NAV_ITEMS.find(
    (item) =>
      pathname === item.href ||
      (item.href !== "/dashboard/admin" && pathname.startsWith(item.href)),
  );
  return match?.label ?? "Overview";
}

export function AdminHeader() {
  const pathname = usePathname();
  const title = getPageTitle(pathname);

  return (
    <header className="flex items-center justify-between gap-4 border-b border-white/10 px-6 py-4 lg:px-8">
      <h1 className="text-xl font-bold text-white">{title}</h1>
      <div className="flex items-center gap-3">
        <NotificationBell />
        <AdminProfileMenu />
      </div>
    </header>
  );
}

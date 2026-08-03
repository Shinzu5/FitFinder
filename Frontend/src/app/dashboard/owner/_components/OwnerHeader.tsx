"use client";

import { usePathname } from "next/navigation";
import { OWNER_NAV_ITEMS } from "./OwnerSidebar";
import { OwnerProfileMenu } from "./OwnerProfileMenu";
import { NotificationBell } from "@/components/notifications/NotificationBell";

function getPageTitle(pathname: string) {
  const match = OWNER_NAV_ITEMS.find(
    (item) => pathname === item.href || (item.href !== "/dashboard/owner" && pathname.startsWith(item.href)),
  );
  return match?.label ?? "Overview";
}

export function OwnerHeader() {
  const pathname = usePathname();
  const title = getPageTitle(pathname);

  return (
    <header className="flex items-center justify-between gap-4 border-b border-white/10 px-6 py-4 lg:px-8">
      <h1 className="text-2xl font-bold text-white">{title}</h1>
      <div className="flex items-center gap-3">
        <NotificationBell />
        <OwnerProfileMenu />
      </div>
    </header>
  );
}

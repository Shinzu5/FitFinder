"use client";

import { usePathname } from "next/navigation";
import { CLERK_NAV_ITEMS } from "./ClerkSidebar";
import { ClerkProfileMenu } from "./ClerkProfileMenu";
import { NotificationBell } from "@/components/notifications/NotificationBell";

function getPageTitle(pathname: string) {
  const match = CLERK_NAV_ITEMS.find(
    (item) =>
      pathname === item.href ||
      (item.href !== "/dashboard/clerk" && pathname.startsWith(item.href)),
  );
  return match?.label ?? "Overview";
}

export function ClerkHeader() {
  const pathname = usePathname();
  const title = getPageTitle(pathname);
  const showTitle = pathname !== "/dashboard/clerk";

  return (
    <header className="flex items-center justify-between gap-4 border-b border-white/10 px-6 py-4 lg:px-8">
      {showTitle ? <h1 className="text-xl font-bold text-white">{title}</h1> : <div />}
      <div className="flex items-center gap-3">
        <NotificationBell />
        <ClerkProfileMenu />
      </div>
    </header>
  );
}

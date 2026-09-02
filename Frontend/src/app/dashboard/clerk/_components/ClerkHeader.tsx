"use client";

import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
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

interface ClerkHeaderProps {
  onOpenMobileMenu?: () => void;
}

export function ClerkHeader({ onOpenMobileMenu }: ClerkHeaderProps) {
  const pathname = usePathname();
  const title = getPageTitle(pathname);
  const showTitle = pathname !== "/dashboard/clerk";

  return (
    <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="rounded-lg border border-white/10 p-2 text-zinc-300 transition hover:bg-white/5 md:hidden"
          aria-label="Open Navigation Menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        {showTitle ? <h1 className="text-xl font-bold text-white sm:text-2xl">{title}</h1> : null}
      </div>
      <div className="flex items-center gap-3">
        <NotificationBell />
        <ClerkProfileMenu />
      </div>
    </header>
  );
}

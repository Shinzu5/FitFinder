"use client";

import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { OWNER_NAV_ITEMS } from "./OwnerSidebar";
import { OwnerProfileMenu } from "./OwnerProfileMenu";
import { NotificationBell } from "@/components/notifications/NotificationBell";

function getPageTitle(pathname: string) {
  const match = OWNER_NAV_ITEMS.find(
    (item) => pathname === item.href || (item.href !== "/dashboard/owner" && pathname.startsWith(item.href)),
  );
  return match?.label ?? "Overview";
}

interface OwnerHeaderProps {
  onOpenMobileMenu?: () => void;
}

export function OwnerHeader({ onOpenMobileMenu }: OwnerHeaderProps) {
  const pathname = usePathname();
  const title = getPageTitle(pathname);

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
        <h1 className="text-xl font-bold text-white sm:text-2xl">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        <NotificationBell />
        <OwnerProfileMenu />
      </div>
    </header>
  );
}

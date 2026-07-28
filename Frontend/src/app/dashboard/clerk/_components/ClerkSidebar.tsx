"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardCheck, CreditCard, LayoutGrid, UserPlus, Users } from "lucide-react";
import { useWalkInApprovalsStore } from "@/stores/walk-in-approvals-store";

export const CLERK_NAV_ITEMS = [
  { label: "Overview", href: "/dashboard/clerk", icon: LayoutGrid },
  { label: "Walk-in Payment", href: "/dashboard/clerk/walk-in", icon: CreditCard },
  { label: "Approvals", href: "/dashboard/clerk/approvals", icon: ClipboardCheck },
  { label: "Register Member", href: "/dashboard/clerk/register", icon: UserPlus },
  { label: "Members", href: "/dashboard/clerk/members", icon: Users },
] as const;

export function ClerkSidebar() {
  const pathname = usePathname();
  const pendingCount = useWalkInApprovalsStore(
    (state) => state.requests.filter((req) => req.status === "pending").length,
  );

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-white/10 bg-[#0A0A0A] px-3 py-5">
      <Link href="/dashboard/clerk" className="mb-8 flex items-center gap-2.5 px-2">
        <Image
          src="/LOGO.png"
          alt="Fit Finder"
          width={32}
          height={32}
          className="h-8 w-8 rounded-md object-contain"
        />
        <span className="text-sm font-bold tracking-wider">
          <span className="text-white">FIT</span>
          <span className="text-[#FFD700]"> FINDER</span>
        </span>
        <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-400">
          Clerk
        </span>
      </Link>

      <nav className="flex flex-1 flex-col gap-0.5">
        {CLERK_NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard/clerk" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                active
                  ? "border-l-2 border-[#FACC15] bg-[#FACC15]/10 font-medium text-[#FACC15]"
                  : "text-zinc-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.href === "/dashboard/clerk/approvals" && pendingCount > 0 ? (
                <span className="rounded-full bg-[#FACC15] px-1.5 py-0.5 text-[10px] font-bold text-black">
                  {pendingCount}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

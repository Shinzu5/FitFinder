"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  ClipboardCheck,
  Dumbbell,
  LayoutGrid,
  MessageSquare,
  Settings,
  User,
  Wallet,
} from "lucide-react";
import { useAdminGymApprovalsStore } from "@/stores/admin-gym-approvals-store";

export const ADMIN_NAV_ITEMS = [
  { label: "Overview", href: "/dashboard/admin", icon: LayoutGrid },
  { label: "Gym Approvals", href: "/dashboard/admin/gym-approvals", icon: ClipboardCheck },
  { label: "Gyms", href: "/dashboard/admin/gyms", icon: Dumbbell },
  { label: "Users", href: "/dashboard/admin/users", icon: User },
  { label: "Transactions", href: "/dashboard/admin/transactions", icon: Wallet },
  { label: "Analytics", href: "/dashboard/admin/analytics", icon: BarChart3 },
  { label: "Messages", href: "/dashboard/admin/messages", icon: MessageSquare },
  { label: "Settings", href: "/dashboard/admin/settings", icon: Settings },
] as const;

export function AdminSidebar() {
  const pathname = usePathname();
  const pendingCount = useAdminGymApprovalsStore(
    (state) => state.applications.filter((app) => app.status === "pending").length,
  );

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-white/10 bg-[#0A0A0A] px-3 py-5">
      <Link href="/dashboard/admin" className="mb-8 flex items-center gap-2.5 px-2">
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
        <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-400">
          Admin
        </span>
      </Link>

      <nav className="flex flex-1 flex-col gap-0.5">
        {ADMIN_NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard/admin" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                active
                  ? "bg-[#FACC15]/10 font-medium text-[#FACC15]"
                  : "text-zinc-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              {active ? (
                <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-[#FACC15]" />
              ) : null}
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.href === "/dashboard/admin/gym-approvals" && pendingCount > 0 ? (
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

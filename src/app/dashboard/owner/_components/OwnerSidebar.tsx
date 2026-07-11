"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  CreditCard,
  Dumbbell,
  LayoutGrid,
  MessageSquare,
  Settings,
  ShoppingBag,
  UserCircle2,
  Users,
  Wrench,
} from "lucide-react";

export const OWNER_NAV_ITEMS = [
  { label: "Overview", href: "/dashboard/owner", icon: LayoutGrid },
  { label: "My Gym", href: "/dashboard/owner/my-gym", icon: Building2 },
  { label: "Memberships", href: "/dashboard/owner/memberships", icon: CreditCard },
  { label: "Members", href: "/dashboard/owner/members", icon: Users },
  { label: "Exercises", href: "/dashboard/owner/exercises", icon: Dumbbell },
  { label: "Equipment", href: "/dashboard/owner/equipment", icon: Wrench },
  { label: "Coaches", href: "/dashboard/owner/coaches", icon: UserCircle2 },
  { label: "Shop", href: "/dashboard/owner/shop", icon: ShoppingBag },
  { label: "Messages", href: "/dashboard/owner/messages", icon: MessageSquare },
  { label: "Payment Settings", href: "/dashboard/owner/payment-settings", icon: Settings },
] as const;

export function OwnerSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-white/10 bg-[#0A0A0A] px-3 py-5">
      <Link href="/dashboard/owner" className="mb-8 flex items-center gap-2.5 px-2">
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
        <span className="rounded-full bg-[#FFD700]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#FFD700]">
          Owner
        </span>
      </Link>

      <nav className="flex flex-1 flex-col gap-0.5">
        {OWNER_NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard/owner" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                active
                  ? "bg-[#FFD700]/10 font-medium text-[#FFD700]"
                  : "text-zinc-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              {active ? (
                <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-[#FFD700]" />
              ) : null}
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

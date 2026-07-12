"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Bell,
  Brain,
  CreditCard,
  Dumbbell,
  Home,
  Lock,
  MessageSquare,
  ShoppingBag,
  Wrench,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { useMembershipStore } from "@/stores/membership-store";
import { UserProfileMenu } from "@/app/dashboard/user/_components/UserProfileMenu";

const NAV_ITEMS = [
  { label: "Home", href: "/dashboard/user", icon: Home, unlockRequired: false },
  { label: "My Membership", href: "/dashboard/user/membership", icon: CreditCard, unlockRequired: true },
  { label: "Exercises", href: "/dashboard/user/exercises", icon: Dumbbell, unlockRequired: true },
  { label: "Equipment", href: "/dashboard/user/equipment", icon: Wrench, unlockRequired: true },
  { label: "Shop", href: "/dashboard/user/shop", icon: ShoppingBag, unlockRequired: true },
  { label: "Messages", href: "/dashboard/user/messages", icon: MessageSquare, unlockRequired: true },
  { label: "AI Assistant", href: "/dashboard/user/ai", icon: Brain, unlockRequired: true },
] as const;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, role, logout, isAuthenticated, hasHydrated } = useAuthStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      useAuthStore.getState().setHasHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;

    if (!isAuthenticated || !role) {
      router.replace("/login");
      return;
    }

    const rolePath = `/dashboard/${role.toLowerCase()}`;
    if (pathname !== rolePath && !pathname.startsWith(`${rolePath}/`)) {
      router.replace(rolePath);
      return;
    }

    setReady(true);
  }, [hasHydrated, isAuthenticated, pathname, role, router]);

  if (!hasHydrated || !ready || !user || !role) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="w-full max-w-sm space-y-3 rounded-2xl border border-white/10 bg-white/5 p-8">
          <div className="h-3 w-24 animate-pulse rounded-full bg-white/10" />
          <div className="h-10 animate-pulse rounded-2xl bg-white/10" />
        </div>
      </div>
    );
  }

  if (pathname.startsWith("/dashboard/user/create-gym")) {
    return <>{children}</>;
  }

  if (role === "USER") {
    const joinedGymId = useMembershipStore.getState().joinedGymId;
    const isGymFlowPage = pathname.startsWith("/dashboard/user/gym/") && !joinedGymId;

    if (isGymFlowPage) {
      return <div className="min-h-screen bg-black text-white">{children}</div>;
    }

    return <UserDashboardFrame pathname={pathname}>{children}</UserDashboardFrame>;
  }

  if (role === "OWNER") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-white/10 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <p className="font-semibold text-[#FFD700]">FitFinder · {role}</p>
          <button
            type="button"
            onClick={() => {
              logout();
              router.replace("/login");
            }}
            className="text-sm text-zinc-400 hover:text-white"
          >
            Logout
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}

function UserDashboardFrame({
  children,
  pathname,
}: {
  children: React.ReactNode;
  pathname: string;
}) {
  const joinedGymId = useMembershipStore((state) => state.joinedGymId);
  const unlocked = Boolean(joinedGymId);

  return (
    <div className="flex min-h-screen bg-black text-white">
      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-white/10 bg-[#0A0A0A] px-4 py-5">
        <Link href="/dashboard/user" className="mb-8 flex items-center gap-2.5 px-2">
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
          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-400">
            Gymer
          </span>
        </Link>

        <nav className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const locked = item.unlockRequired && !unlocked;
            const active = pathname === item.href;
            const Icon = item.icon;

            if (locked) {
              return (
                <div
                  key={item.label}
                  className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-600"
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  <Lock className="h-3.5 w-3.5 shrink-0" />
                </div>
              );
            }

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                  active
                    ? "border-l-2 border-[#FACC15] bg-[#FACC15]/10 font-medium text-[#FACC15]"
                    : "text-zinc-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-end gap-4 border-b border-white/10 px-6 py-3">
          <div className="flex items-center gap-3">
            {!unlocked ? (
              <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-zinc-900/80 px-3 py-1.5 text-xs text-zinc-300 sm:flex">
                <span className="text-[#FFD700]">⚠</span>
                Join a gym to unlock all features
              </div>
            ) : null}
            <button type="button" className="rounded-full border border-white/10 p-2 text-zinc-300">
              <Bell className="h-4 w-4" />
            </button>
            <UserProfileMenu />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-6 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

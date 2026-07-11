"use client";

import Link from "next/link";
import {
  Bell,
  House,
  Lock,
  Menu,
  MessageSquare,
  ShoppingBag,
  Sparkles,
  X,
  Dumbbell,
  CreditCard,
  Settings,
  ChevronDown,
  User,
  AlertTriangle,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { type AuthSession } from "@/lib/auth";

interface UserDashboardShellProps {
  user: AuthSession["user"];
  children: React.ReactNode;
}

const sidebarNavigationItems = [
  { label: "My Membership", icon: CreditCard },
  { label: "Exercises", icon: Dumbbell },
  { label: "Equipment", icon: Settings },
  { label: "Shop", icon: ShoppingBag },
  { label: "Messages", icon: MessageSquare },
  { label: "AI Assistant", icon: Sparkles },
] as const;

export function UserDashboardShell({ user, children }: UserDashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden w-[280px] shrink-0 border-r border-zinc-900 bg-[#070708] px-5 py-6 lg:flex lg:flex-col">
          {/* Logo with Gymer Badge */}
          <div className="mb-8 flex items-center justify-between gap-2 pl-1.5">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FACC15] text-black">
                <Dumbbell className="h-5 w-5 transform -rotate-45" />
              </div>
              <span className="text-base font-black tracking-wider uppercase">
                <span className="text-white">FIT</span>
                <span className="text-[#FACC15] ml-0.5">FINDER</span>
              </span>
            </Link>
            <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 uppercase tracking-wide">
              Gymer
            </span>
          </div>

          {/* Navigation Items (Locked) */}
          <nav className="space-y-1.5">
            {sidebarNavigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  title="Join a gym to unlock this feature."
                  aria-label={item.label}
                  disabled
                  className="flex w-full cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition hover:bg-transparent"
                >
                  <Icon className="h-4.5 w-4.5 text-zinc-700" />
                  <span className="flex-1 text-left text-zinc-500 font-medium">{item.label}</span>
                  <Lock className="h-3.5 w-3.5 text-zinc-700" />
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Content Area */}
        <div className="w-full">
          {/* Top Sticky Header */}
          <header className="sticky top-0 z-40 border-b border-zinc-900 bg-[#050505] backdrop-blur-xl">
            <div className="flex items-center justify-between px-6 py-1 sm:px-8">
              {/* Left Side: Mobile Trigger & Breadcrumb Tab */}
              <div className="flex items-center gap-4">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="lg:hidden bg-zinc-900 border-zinc-800 text-white"
                  onClick={() => setMobileOpen(true)}
                  aria-label="Open navigation menu"
                >
                  <Menu className="h-4 w-4" />
                </Button>

                <div className="relative flex items-center gap-2 px-1.5 py-4 text-sm font-semibold text-[#FACC15] cursor-pointer select-none">
                  <House className="h-4.5 w-4.5" />
                  <span>Home</span>
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#FACC15]" />
                </div>
              </div>

              {/* Right Side: Quick Info, Bell, Profile */}
              <div className="flex items-center gap-5 py-3">
                <div className="hidden md:flex items-center gap-2 rounded-full border border-yellow-500/20 bg-yellow-500/5 px-3 py-1.5 text-xs text-zinc-400">
                  <AlertTriangle className="h-3.5 w-3.5 text-yellow-500/80" />
                  <span>Join a gym to unlock all features</span>
                </div>

                <button
                  type="button"
                  aria-label="Open notifications"
                  className="text-zinc-400 transition hover:text-white"
                >
                  <Bell className="h-5 w-5" />
                </button>

                <div className="flex items-center gap-2.5 cursor-pointer select-none rounded-full py-1 pl-1 pr-2 hover:bg-white/5 transition duration-150">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FACC15] text-black font-bold text-xs">
                    <User className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium text-zinc-300">
                    {user.fullName.split(" ")[0]}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="mx-auto max-w-7xl px-6 py-8 lg:px-8">{children}</main>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen ? (
          <motion.div
            className="fixed inset-0 z-50 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
            <motion.aside
              initial={{ x: -40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -40, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute left-0 top-0 h-full w-[280px] border-r border-zinc-900 bg-[#070708] p-5 backdrop-blur-xl flex flex-col"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FACC15] text-black">
                    <Dumbbell className="h-4 w-4 transform -rotate-45" />
                  </div>
                  <span className="text-sm font-black tracking-wider uppercase text-white">
                    FIT <span className="text-[#FACC15]">FINDER</span>
                  </span>
                </div>
                <button
                  type="button"
                  className="rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-zinc-300"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close navigation menu"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <nav className="mt-8 space-y-2 flex-1">
                <Link
                  href="/dashboard/user"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold bg-[#FACC15]/10 text-[#FACC15] transition"
                >
                  <House className="h-4.5 w-4.5" />
                  <span>Home</span>
                </Link>

                {sidebarNavigationItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      disabled
                      className="flex w-full cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-zinc-600 transition"
                    >
                      <Icon className="h-4.5 w-4.5 text-zinc-700" />
                      <span className="flex-1 text-left text-zinc-500 font-medium">{item.label}</span>
                      <Lock className="h-3.5 w-3.5 text-zinc-700" />
                    </button>
                  );
                })}
              </nav>
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

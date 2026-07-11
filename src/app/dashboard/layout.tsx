"use client";

import { useRouter, usePathname } from "next/navigation";
import { Bell, LogOut, ShieldCheck, UserCircle2 } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { useEffect } from "react";
import { motion } from "framer-motion";

import { UserDashboardShell } from "@/components/features/dashboard/UserDashboardShell";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, role, logout, isAuthenticated, loading } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    if (role && !pathname.startsWith(`/dashboard/${role.toLowerCase()}`)) {
      router.replace(`/dashboard/${role.toLowerCase()}`);
    }
  }, [isAuthenticated, pathname, role, router]);

  if (loading && !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505] text-white">
        <div className="w-full max-w-sm space-y-3 rounded-[1.75rem] border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
          <div className="h-3 w-24 animate-pulse rounded-full bg-white/10" />
          <div className="h-10 animate-pulse rounded-2xl bg-white/10" />
          <div className="h-10 animate-pulse rounded-2xl bg-white/10" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user || !role) {
    return null;
  }

  if (role === "USER" && pathname.startsWith("/dashboard/user")) {
    return <UserDashboardShell user={user}>{children}</UserDashboardShell>;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(250,204,21,0.15),_transparent_45%),_#050505] text-white">
      <header className="border-b border-white/10 bg-black/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-[#FACC15]/30 bg-[#FACC15]/10 p-2">
              <ShieldCheck className="h-5 w-5 text-[#FACC15]" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-[#FACC15]">FitFinder</p>
              <p className="text-sm text-zinc-400">Secure workspace</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="rounded-2xl border border-white/10 bg-white/5 p-2.5 text-zinc-200 transition hover:bg-white/10">
              <Bell className="h-5 w-5" />
            </button>
            <div className="hidden items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 sm:flex">
              <UserCircle2 className="h-8 w-8 text-[#FACC15]" />
              <div>
                <p className="text-sm font-medium text-white">{user.fullName}</p>
                <p className="text-xs text-zinc-400">{user.email}</p>
              </div>
            </div>
            <button onClick={logout} className="rounded-2xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-200 transition hover:bg-red-500/20">
              <span className="mr-2 inline-flex items-center"><LogOut className="mr-1 h-4 w-4" /></span>
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-[1.75rem] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-[#FACC15]">Role-based dashboard</p>
            <h1 className="mt-2 text-2xl font-semibold text-white">Welcome back, {user.fullName}</h1>
          </div>
          <div className="rounded-full border border-[#FACC15]/20 bg-[#FACC15]/10 px-4 py-2 text-sm font-medium text-[#FACC15]">{role}</div>
        </motion.div>
        {children}
      </main>
    </div>
  );
}

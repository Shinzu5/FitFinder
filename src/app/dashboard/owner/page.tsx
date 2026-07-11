"use client";

import { useAuthStore } from "@/stores/auth-store";

export default function OwnerDashboardPage() {
  const { user, role } = useAuthStore();

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <section className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
        <p className="text-sm uppercase tracking-[0.3em] text-[#FACC15]">Owner workspace</p>
        <h2 className="mt-3 text-2xl font-semibold">Gym operations overview</h2>
        <p className="mt-3 text-sm text-zinc-400">Track memberships, classes, and studio performance from a polished command center.</p>
      </section>
      <section className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
        <p className="text-sm font-medium text-white">Signed in as</p>
        <p className="mt-2 text-lg font-semibold">{user?.fullName}</p>
        <p className="text-sm text-zinc-400">{user?.email}</p>
        <div className="mt-4 inline-flex rounded-full border border-[#FACC15]/20 bg-[#FACC15]/10 px-3 py-1 text-sm text-[#FACC15]">{role}</div>
      </section>
    </div>
  );
}

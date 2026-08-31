"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useClerkStore } from "@/stores/clerk-store";
import { TransactionsTable } from "./ClerkTransactionsTable";

export function ClerkOverviewPanel() {
  const gymName = useClerkStore((state) => state.gymName);
  const transactions = useClerkStore((state) => state.transactions);
  const walkInsToday = useClerkStore((state) => state.walkInsToday);
  const revenueToday = useClerkStore((state) => state.revenueToday);
  const newMembersToday = useClerkStore((state) => state.newMembersToday);
  const activeNow = useClerkStore((state) => state.activeNow);
  const loading = useClerkStore((state) => state.loading);
  const fetchAll = useClerkStore((state) => state.fetchAll);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const statCards = [
    { label: "Walk-ins Today", value: String(walkInsToday), highlight: false },
    { label: "Revenue Today", value: `₱${revenueToday.toLocaleString()}`, highlight: true },
    { label: "New Members", value: String(newMembersToday), highlight: false },
    { label: "Active Now", value: String(activeNow), highlight: false },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-zinc-800/70 bg-[#0e0e10] px-6 py-6 shadow-[0_0_40px_rgba(250,204,21,0.06)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#FACC15]/60 to-transparent" />
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-[#FACC15]">Front Desk Operations</h2>
            <p className="mt-1 text-sm text-[#FACC15]/80">
              Ready to process walk-ins for {gymName || "your gym"}.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/clerk/walk-in"
              className="rounded-xl bg-[#FACC15] px-5 py-2.5 text-sm font-bold text-black transition hover:bg-[#e6c200]"
            >
              New Walk-in Payment
            </Link>
            <Link
              href="/dashboard/clerk/register"
              className="rounded-xl border border-zinc-700 bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-zinc-300 transition hover:border-zinc-600 hover:text-white"
            >
              Register Member
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat) => (
          <article
            key={stat.label}
            className="rounded-2xl border border-zinc-800/70 bg-[#0e0e10] px-5 py-5"
          >
            <p className="text-sm text-zinc-500">{stat.label}</p>
            <p
              className={`mt-2 text-3xl font-bold ${
                stat.highlight ? "text-[#FACC15]" : "text-white"
              }`}
            >
              {loading ? "…" : stat.value}
            </p>
          </article>
        ))}
      </div>

      <section className="overflow-hidden rounded-2xl border border-zinc-800/70 bg-[#0e0e10]">
        <div className="flex items-center justify-between gap-4 border-b border-zinc-800/70 px-5 py-4">
          <h2 className="text-lg font-bold text-white">Recent Transactions</h2>
          <Link
            href="/dashboard/clerk/walk-in"
            className="rounded-xl border border-[#FACC15]/50 px-4 py-2 text-xs font-bold text-[#FACC15] transition hover:bg-[#FACC15]/10"
          >
            New Payment
          </Link>
        </div>
        <TransactionsTable transactions={transactions.slice(0, 10)} />
      </section>
    </div>
  );
}

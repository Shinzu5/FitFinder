"use client";

import { useMemo } from "react";
import Link from "next/link";
import { CLERK_GYM_NAME, useClerkStore } from "@/stores/clerk-store";
import { TransactionsTable } from "./ClerkTransactionsTable";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function ClerkOverviewPanel() {
  const transactions = useClerkStore((state) => state.transactions);
  const members = useClerkStore((state) => state.members);
  const activeNow = useClerkStore((state) => state.activeNow);

  const stats = useMemo(() => {
    const todayStart = startOfToday();
    const todayTxns = transactions.filter((txn) => txn.createdAt >= todayStart);
    const newMembersToday = members.filter((m) => m.joinedAt >= todayStart).length;

    return {
      walkInsToday: todayTxns.length,
      revenueToday: todayTxns.reduce((sum, txn) => sum + txn.amount, 0),
      newMembersToday,
      activeNow,
    };
  }, [transactions, members, activeNow]);

  const statCards = [
    { label: "Walk-ins Today", value: String(stats.walkInsToday), highlight: false },
    { label: "Revenue Today", value: `₱${stats.revenueToday.toLocaleString()}`, highlight: true },
    { label: "New Members", value: String(stats.newMembersToday), highlight: false },
    { label: "Active Now", value: String(stats.activeNow), highlight: false },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-zinc-800/70 bg-[#0e0e10] px-6 py-6 shadow-[0_0_40px_rgba(250,204,21,0.06)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#FACC15]/60 to-transparent" />
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-[#FACC15]">Front Desk Operations</h2>
            <p className="mt-1 text-sm text-[#FACC15]/80">
              Ready to process walk-ins for {CLERK_GYM_NAME}.
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
              {stat.value}
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

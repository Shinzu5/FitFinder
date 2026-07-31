"use client";

import { useEffect } from "react";
import {
  formatOwnerPlanTransactionDate,
  formatPesoAmount,
  useOwnerPlanTransactionsStore,
} from "@/stores/owner-plan-transactions-store";
import { useAuthStore } from "@/stores/auth-store";
import { getSocket } from "@/lib/socket";

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl border border-zinc-800/70 bg-[#0e0e10] px-5 py-5">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-white">
        <span className="text-[#FACC15]">₱</span>
        {value}
      </p>
    </article>
  );
}

export function AdminTransactionsPanel() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const transactions = useOwnerPlanTransactionsStore((state) => state.transactions);
  const stats = useOwnerPlanTransactionsStore((state) => state.stats);
  const loading = useOwnerPlanTransactionsStore((state) => state.loading);
  const error = useOwnerPlanTransactionsStore((state) => state.error);
  const fetchTransactions = useOwnerPlanTransactionsStore((state) => state.fetchTransactions);

  useEffect(() => {
    void fetchTransactions();
    const onFocus = () => void fetchTransactions();
    window.addEventListener("focus", onFocus);
    const id = window.setInterval(() => void fetchTransactions(), 30000);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(id);
    };
  }, [fetchTransactions]);

  useEffect(() => {
    if (!accessToken) return;
    const socket = getSocket(accessToken);
    const onUpdated = () => {
      void fetchTransactions();
    };
    socket.on("admin_gyms_updated", onUpdated);
    return () => {
      socket.off("admin_gyms_updated", onUpdated);
    };
  }, [accessToken, fetchTransactions]);

  const statCards = [
    { label: "Today", value: formatPesoAmount(stats.today) },
    { label: "This Week", value: formatPesoAmount(stats.thisWeek, true) },
    { label: "This Month", value: formatPesoAmount(stats.thisMonth, true) },
    { label: "Total", value: formatPesoAmount(stats.total, true) },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat) => (
          <StatCard key={stat.label} label={stat.label} value={stat.value} />
        ))}
      </div>

      {error ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </p>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-zinc-800/70 bg-[#0e0e10]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-800/80 bg-[#131315] text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <th className="px-5 py-4">Ref</th>
                <th className="px-5 py-4">Gym</th>
                <th className="px-5 py-4">Owner</th>
                <th className="px-5 py-4">Plan</th>
                <th className="px-5 py-4">Days Left</th>
                <th className="px-5 py-4">Amount</th>
                <th className="px-5 py-4">Method</th>
                <th className="px-5 py-4">Date</th>
              </tr>
            </thead>
            <tbody>
              {loading && transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-zinc-500">
                    Loading transactions…
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-zinc-500">
                    No owner plan transactions yet.
                  </td>
                </tr>
              ) : (
                transactions.map((txn) => (
                  <tr key={txn.id} className="border-b border-zinc-800/50 last:border-0">
                    <td className="px-5 py-4 font-medium text-zinc-400">
                      {txn.referenceNo || txn.id.slice(0, 8)}
                    </td>
                    <td className="px-5 py-4 font-semibold text-white">{txn.gymName}</td>
                    <td className="px-5 py-4 text-zinc-300">
                      <span className="block text-white">{txn.ownerName}</span>
                      <span className="text-xs text-zinc-500">{txn.ownerEmail}</span>
                    </td>
                    <td className="px-5 py-4 text-zinc-300">
                      {txn.planName}
                      {txn.months ? (
                        <span className="block text-xs text-zinc-500">
                          {txn.months} day{txn.months === 1 ? "" : "s"}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-5 py-4">
                      {typeof txn.daysLeft === "number" ? (
                        txn.daysLeft === 0 ? (
                          <span className="text-red-400">Expired</span>
                        ) : (
                          <span className="font-semibold text-[#FACC15]">
                            {txn.daysLeft} day{txn.daysLeft === 1 ? "" : "s"}
                          </span>
                        )
                      ) : (
                        <span className="text-zinc-500">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-bold text-white">
                        <span className="text-[#FACC15]">₱</span>
                        {txn.amount.toLocaleString("en-PH")}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex rounded-full border border-zinc-700 bg-zinc-800/80 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-400">
                        {txn.method}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-zinc-400">
                      {formatOwnerPlanTransactionDate(txn.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

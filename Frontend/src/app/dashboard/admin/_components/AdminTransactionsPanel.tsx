"use client";

import {
  formatOwnerPlanTransactionDate,
  formatPesoAmount,
  useOwnerPlanTransactionsStore,
} from "@/stores/owner-plan-transactions-store";

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
  const transactions = useOwnerPlanTransactionsStore((state) => state.transactions);
  const getStats = useOwnerPlanTransactionsStore((state) => state.getStats);
  const stats = getStats();

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

      <section className="overflow-hidden rounded-2xl border border-zinc-800/70 bg-[#0e0e10]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-800/80 bg-[#131315] text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <th className="px-5 py-4">ID</th>
                <th className="px-5 py-4">Gym</th>
                <th className="px-5 py-4">Type</th>
                <th className="px-5 py-4">Amount</th>
                <th className="px-5 py-4">Method</th>
                <th className="px-5 py-4">Date</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-zinc-500">
                    No owner plan transactions yet.
                  </td>
                </tr>
              ) : (
                transactions.map((txn) => (
                  <tr key={txn.id} className="border-b border-zinc-800/50 last:border-0">
                    <td className="px-5 py-4 font-medium text-zinc-400">{txn.id}</td>
                    <td className="px-5 py-4 font-semibold text-white">{txn.gymName}</td>
                    <td className="px-5 py-4 text-zinc-300">{txn.planName} Plan</td>
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

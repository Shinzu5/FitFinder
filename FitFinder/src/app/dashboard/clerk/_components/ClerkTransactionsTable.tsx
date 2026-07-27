"use client";

import type { PaymentMethod, TransactionType } from "@/stores/clerk-store";
import {
  formatTransactionTime,
  getPaymentMethodLabel,
  getTransactionTypeLabel,
} from "@/stores/clerk-store";

export function TypeBadge({ type }: { type: TransactionType }) {
  return (
    <span className="inline-flex rounded-full border border-zinc-700 bg-zinc-800/80 px-2.5 py-0.5 text-[11px] font-semibold capitalize text-zinc-400">
      {getTransactionTypeLabel(type)}
    </span>
  );
}

export function MethodBadge({ method }: { method: PaymentMethod }) {
  const isCash = method === "cash";
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
        isCash
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
          : "border-blue-500/30 bg-blue-500/10 text-blue-400"
      }`}
    >
      {getPaymentMethodLabel(method)}
    </span>
  );
}

interface TransactionRow {
  id: string;
  type: TransactionType;
  member: string;
  amount: number;
  method: PaymentMethod;
  notes: string;
  createdAt: number;
}

interface TransactionsTableProps {
  transactions: TransactionRow[];
  emptyMessage?: string;
}

export function TransactionsTable({ transactions, emptyMessage }: TransactionsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-800/80 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <th className="px-5 py-4 font-semibold">Type</th>
            <th className="px-5 py-4 font-semibold">Member</th>
            <th className="px-5 py-4 font-semibold">Amount</th>
            <th className="px-5 py-4 font-semibold">Method</th>
            <th className="px-5 py-4 font-semibold">Notes / Items</th>
            <th className="px-5 py-4 font-semibold">Time</th>
          </tr>
        </thead>
        <tbody>
          {transactions.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-5 py-12 text-center text-zinc-500">
                {emptyMessage ?? "No transactions yet."}
              </td>
            </tr>
          ) : (
            transactions.map((txn) => (
              <tr key={txn.id} className="border-b border-zinc-800/50 last:border-0">
                <td className="px-5 py-4">
                  <TypeBadge type={txn.type} />
                </td>
                <td className="px-5 py-4 font-semibold text-white">{txn.member}</td>
                <td className="px-5 py-4 font-bold text-[#FACC15]">
                  ₱{txn.amount.toLocaleString()}
                </td>
                <td className="px-5 py-4">
                  <MethodBadge method={txn.method} />
                </td>
                <td className="px-5 py-4 text-zinc-400">{txn.notes || "—"}</td>
                <td className="px-5 py-4 text-zinc-500">{formatTransactionTime(txn.createdAt)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

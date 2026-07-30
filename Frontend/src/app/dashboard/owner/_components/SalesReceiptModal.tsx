"use client";

import type { SalesReportReceipt } from "@/stores/owner-sales-reports-store";
import { getTransactionDisplayLabel, type TransactionType } from "@/stores/clerk-store";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function txnLabel(type: string) {
  try {
    return getTransactionDisplayLabel(type as TransactionType);
  } catch {
    return type;
  }
}

interface SalesReceiptModalProps {
  receipt: SalesReportReceipt;
  onClose: () => void;
}

/** View-only receipt — no print / download / export / share. */
export function SalesReceiptModal({ receipt, onClose }: SalesReceiptModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/75"
        onClick={onClose}
        aria-label="Close receipt"
      />
      <div className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-zinc-800 bg-[#0e0e10] shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-zinc-800 bg-[#0e0e10]/95 px-6 py-4 backdrop-blur">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#FACC15]">
              Daily Sales Receipt
            </p>
            <h3 className="text-lg font-bold text-white">View only</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-900"
          >
            Close
          </button>
        </div>

        <div className="space-y-6 px-6 py-6">
          <header className="border-b border-zinc-800 pb-5 text-center">
            <h2 className="text-2xl font-bold text-white">{receipt.gymName}</h2>
            <p className="mt-1 text-sm text-zinc-500">{receipt.gymAddress}</p>
            <p className="mt-3 text-sm text-zinc-400">
              Report Date · <span className="text-white">{formatDate(receipt.date)}</span>
            </p>
          </header>

          <section className="grid gap-3 rounded-xl border border-zinc-800 bg-[#131315] px-4 py-4 text-sm sm:grid-cols-2">
            <div>
              <p className="text-zinc-500">Clerk</p>
              <p className="mt-0.5 font-semibold text-white">{receipt.clerkName}</p>
            </div>
            <div>
              <p className="text-zinc-500">Status</p>
              <p className="mt-0.5 font-semibold text-emerald-400">{receipt.status}</p>
            </div>
            <div>
              <p className="text-zinc-500">Closed At</p>
              <p className="mt-0.5 font-semibold text-white">{formatDateTime(receipt.closedAt)}</p>
            </div>
            <div>
              <p className="text-zinc-500">Report ID</p>
              <p className="mt-0.5 font-mono text-xs text-zinc-400">{receipt.id}</p>
            </div>
          </section>

          <section>
            <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-zinc-400">
              Transactions
            </h4>
            <div className="overflow-hidden rounded-xl border border-zinc-800">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 bg-[#131315] text-xs uppercase tracking-wide text-zinc-500">
                    <th className="px-4 py-3">Time</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Member / Details</th>
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {receipt.transactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                        No transactions linked to this report.
                      </td>
                    </tr>
                  ) : (
                    receipt.transactions.map((txn) => (
                      <tr key={txn.id} className="border-b border-zinc-800/60 last:border-0">
                        <td className="px-4 py-3 text-zinc-400">
                          {new Date(txn.createdAt).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-4 py-3 text-white">{txnLabel(txn.type)}</td>
                        <td className="px-4 py-3">
                          <p className="text-white">{txn.memberName}</p>
                          {txn.notes ? (
                            <p className="mt-0.5 text-xs text-zinc-500">{txn.notes}</p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-zinc-400">{txn.method}</td>
                        <td className="px-4 py-3 text-right font-semibold text-[#FACC15]">
                          ₱{txn.amount.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-xl border border-[#FACC15]/30 bg-[#FACC15]/5 px-5 py-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-400">Total Transactions</span>
              <span className="font-bold text-white">{receipt.totalTransactions}</span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-zinc-400">Total Revenue</span>
              <span className="text-2xl font-bold text-[#FACC15]">
                ₱{receipt.totalRevenue.toLocaleString()}
              </span>
            </div>
          </section>

          <p className="text-center text-xs text-zinc-600">
            This receipt is private to the gym owner. Printing, download, and sharing are disabled.
          </p>
        </div>
      </div>
    </div>
  );
}

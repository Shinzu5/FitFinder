"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import {
  useOwnerSalesReportsStore,
  type SalesReportReceipt,
} from "@/stores/owner-sales-reports-store";
import { SalesReceiptModal } from "./SalesReceiptModal";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function OwnerReportsPanel() {
  const reports = useOwnerSalesReportsStore((s) => s.reports);
  const loading = useOwnerSalesReportsStore((s) => s.loading);
  const error = useOwnerSalesReportsStore((s) => s.error);
  const search = useOwnerSalesReportsStore((s) => s.search);
  const dateFilter = useOwnerSalesReportsStore((s) => s.dateFilter);
  const setSearch = useOwnerSalesReportsStore((s) => s.setSearch);
  const setDateFilter = useOwnerSalesReportsStore((s) => s.setDateFilter);
  const fetchReports = useOwnerSalesReportsStore((s) => s.fetchReports);
  const fetchReceipt = useOwnerSalesReportsStore((s) => s.fetchReceipt);
  const clearReceipt = useOwnerSalesReportsStore((s) => s.clearReceipt);

  const [receipt, setReceipt] = useState<SalesReportReceipt | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);

  useEffect(() => {
    void fetchReports();
  }, [fetchReports]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    await fetchReports();
  }

  async function handleViewReceipt(id: string) {
    setOpeningId(id);
    const data = await fetchReceipt(id);
    setOpeningId(null);
    if (data) setReceipt(data);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Daily Sales Reports</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Closed daily sales receipts from Owner and Clerk. Each closing creates one receipt here.
        </p>
      </div>

      <form
        onSubmit={(e) => void handleSearch(e)}
        className="flex flex-col gap-3 rounded-2xl border border-zinc-800/70 bg-[#0e0e10] p-4 sm:flex-row sm:items-end"
      >
        <div className="flex-1 space-y-2">
          <label htmlFor="report-search" className="text-xs font-medium text-zinc-500">
            Search clerk
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              id="report-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Clerk name or email"
              className="w-full rounded-xl border border-zinc-800 bg-[#131315] py-2.5 pl-10 pr-4 text-sm text-white outline-none focus:border-[#FFD700]/40"
            />
          </div>
        </div>
        <div className="space-y-2 sm:w-48">
          <label htmlFor="report-date" className="text-xs font-medium text-zinc-500">
            Filter by date
          </label>
          <input
            id="report-date"
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-[#131315] px-4 py-2.5 text-sm text-white outline-none focus:border-[#FFD700]/40"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded-xl bg-[#FFD700] px-5 py-2.5 text-sm font-bold text-black hover:bg-[#e6c200]"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setDateFilter("");
              void fetchReports({ search: "", dateFilter: "" });
            }}
            className="rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-zinc-900"
          >
            Clear
          </button>
        </div>
      </form>

      {error ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </p>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-zinc-800/70 bg-[#0e0e10]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-190 text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-800/80 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <th className="px-5 py-4">Date</th>
                <th className="px-5 py-4">Closed By</th>
                <th className="px-5 py-4">Transactions</th>
                <th className="px-5 py-4">Revenue</th>
                <th className="px-5 py-4">Closed Time</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {loading && reports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-zinc-500">
                    Loading reports…
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-zinc-500">
                    No daily sales reports yet. Close today&apos;s walk-in payments to save a receipt
                    here.
                  </td>
                </tr>
              ) : (
                reports.map((report) => {
                  const closedByOwner =
                    String(report.closedByRole || "").toUpperCase() === "OWNER";
                  const closedBy =
                    report.closedByLabel ||
                    (closedByOwner ? "Closed by Owner" : `Closed by Clerk · ${report.clerkName}`);
                  return (
                    <tr key={report.id} className="border-b border-zinc-800/50 last:border-0">
                      <td className="px-5 py-4 font-semibold text-white">
                        {formatDate(report.date)}
                      </td>
                      <td className="px-5 py-4 text-zinc-300">{closedBy}</td>
                      <td className="px-5 py-4 text-zinc-300">{report.totalTransactions}</td>
                      <td className="px-5 py-4 font-bold text-[#FFD700]">
                        ₱{report.totalRevenue.toLocaleString()}
                      </td>
                      <td className="px-5 py-4 text-zinc-400">{formatTime(report.closedAt)}</td>
                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
                          {report.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          disabled={openingId === report.id}
                          onClick={() => void handleViewReceipt(report.id)}
                          className="rounded-lg border border-[#FFD700]/40 px-3 py-1.5 text-xs font-bold text-[#FFD700] hover:bg-[#FFD700]/10 disabled:opacity-60"
                        >
                          {openingId === report.id ? "Opening…" : "View Receipt"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {receipt ? (
        <SalesReceiptModal
          receipt={receipt}
          onClose={() => {
            setReceipt(null);
            clearReceipt();
          }}
        />
      ) : null}
    </div>
  );
}

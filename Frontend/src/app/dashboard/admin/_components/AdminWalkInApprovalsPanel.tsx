"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { formatApprovalTime } from "@/stores/walk-in-approvals-store";

interface AdminWalkInRow {
  id: string;
  memberName: string;
  memberEmail: string;
  gymName: string;
  planName: string;
  totalPaid: number;
  paymentStatus: string;
  status: string;
  rejectionReason?: string;
  submittedAt: number;
  reviewedAt?: number | null;
}

/** Read-only admin view of all walk-in approvals (reuse existing API shape). */
export function AdminWalkInApprovalsPanel() {
  const [rows, setRows] = useState<AdminWalkInRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/admin/walk-in-approvals");
        if (!cancelled && data.success) {
          setRows(data.data || []);
        }
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-white">Walk-in Approvals</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Platform-wide view. Owners and Clerks approve from their gym dashboards.
        </p>
      </div>

      <section className="overflow-hidden rounded-2xl border border-zinc-800/70 bg-[#0e0e10]">
        {loading ? (
          <p className="px-5 py-12 text-center text-sm text-zinc-500">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-zinc-500">No walk-in requests yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800/80 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  <th className="px-5 py-4">Member</th>
                  <th className="px-5 py-4">Gym</th>
                  <th className="px-5 py-4">Plan</th>
                  <th className="px-5 py-4">Paid</th>
                  <th className="px-5 py-4">Approval</th>
                  <th className="px-5 py-4">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-zinc-800/50 last:border-0">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-white">{row.memberName}</p>
                      <p className="text-xs text-zinc-500">{row.memberEmail}</p>
                    </td>
                    <td className="px-5 py-4 text-zinc-400">{row.gymName}</td>
                    <td className="px-5 py-4 text-zinc-400">{row.planName}</td>
                    <td className="px-5 py-4 text-[#FACC15]">
                      ₱{Number(row.totalPaid).toLocaleString()}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${
                          row.status === "approved"
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                            : row.status === "pending"
                              ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                              : "border-red-500/30 bg-red-500/10 text-red-400"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-zinc-500">
                      {formatApprovalTime(row.submittedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

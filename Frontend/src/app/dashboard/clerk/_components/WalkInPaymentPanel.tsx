"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { useClerkStore } from "@/stores/clerk-store";
import {
  formatTransactionTime,
  getPaymentMethodLabel,
  getTransactionDisplayLabel,
} from "@/stores/clerk-store";
import {
  formatApprovalTime,
  useWalkInApprovalsStore,
} from "@/stores/walk-in-approvals-store";
import { useOwnerSalesReportsStore } from "@/stores/owner-sales-reports-store";

type CustomerType = "guest" | "existing";

export function WalkInPaymentPanel() {
  const role = useAuthStore((state) => state.role);
  const members = useClerkStore((state) => state.members);
  const transactions = useClerkStore((state) => state.transactions);
  const recordPayment = useClerkStore((state) => state.recordPayment);
  const fetchMembers = useClerkStore((state) => state.fetchMembers);
  const fetchTransactions = useClerkStore((state) => state.fetchTransactions);
  const fetchDashboard = useClerkStore((state) => state.fetchDashboard);
  const fetchClosingPreview = useClerkStore((state) => state.fetchClosingPreview);
  const closeDailySales = useClerkStore((state) => state.closeDailySales);
  const fetchAll = useClerkStore((state) => state.fetchAll);
  const fetchOwnerReports = useOwnerSalesReportsStore((state) => state.fetchReports);

  const requests = useWalkInApprovalsStore((state) => state.requests);
  const awaitingPayment = useMemo(
    () => requests.filter((req) => req.status === "approved" && !req.consumedAt),
    [requests],
  );
  const fetchWalkInPayments = useWalkInApprovalsStore((state) => state.fetchWalkInPayments);
  const completeWalkInPayment = useWalkInApprovalsStore((state) => state.completeWalkInPayment);

  const [customerType, setCustomerType] = useState<CustomerType>("guest");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [paidConfirmed, setPaidConfirmed] = useState<Record<string, boolean>>({});
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closingBusy, setClosingBusy] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);
  const [closeSuccess, setCloseSuccess] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    date: string;
    totalTransactions: number;
    totalRevenue: number;
    canClose: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    void Promise.all([
      fetchMembers(),
      fetchTransactions(),
      fetchDashboard(),
      fetchWalkInPayments(),
    ]);
  }, [fetchMembers, fetchTransactions, fetchDashboard, fetchWalkInPayments]);

  async function openCloseModal() {
    setCloseError(null);
    setCloseSuccess(null);
    setClosingBusy(true);
    const data = await fetchClosingPreview();
    setClosingBusy(false);
    if (!data) {
      setCloseError("Could not load closing preview.");
      return;
    }
    setPreview(data);
    setShowCloseModal(true);
  }

  async function confirmClose() {
    setClosingBusy(true);
    setCloseError(null);
    const ok = await closeDailySales();
    setClosingBusy(false);
    if (!ok) {
      setCloseError("Failed to close daily sales. New transactions may be required.");
      return;
    }
    setShowCloseModal(false);
    void fetchOwnerReports();
    if (role === "OWNER") {
      setCloseSuccess(
        "Daily sales closed by Owner. Receipt saved to Reports. Running log reset.",
      );
    } else {
      setCloseSuccess(
        "Daily sales closed. Receipt saved to Owner Reports. Running counter reset to zero.",
      );
    }
  }

  function getMemberName() {
    if (customerType === "guest") return "Guest";
    const member = members.find((m) => m.id === selectedMemberId);
    return member ? `${member.firstName} ${member.lastName}` : "Guest";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    if (customerType === "existing" && !selectedMemberId) {
      setError("Select a member.");
      return;
    }

    setSubmitting(true);
    const ok = await recordPayment({
      type: "day-pass",
      member: getMemberName(),
      amount: parsedAmount,
      method: "cash",
      notes,
    });
    setSubmitting(false);

    if (!ok) {
      setError("Failed to record payment.");
      return;
    }

    setAmount("");
    setNotes("");
    setSubmitted(true);
    window.setTimeout(() => setSubmitted(false), 2000);
  }

  async function handleDone(id: string) {
    if (!paidConfirmed[id]) return;
    setCompletingId(id);
    const ok = await completeWalkInPayment(id);
    setCompletingId(null);
    if (!ok) return;
    await Promise.all([fetchTransactions(), fetchAll(), fetchWalkInPayments()]);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="overflow-hidden rounded-2xl border border-zinc-800/70 bg-[#0e0e10]">
        <div className="border-b border-zinc-800/70 px-5 py-4">
          <h2 className="text-xl font-bold text-white">Approved Membership Payments</h2>
          <p className="mt-1 text-sm text-zinc-500">
            After Approvals → Approve, requests appear here. Confirm cash received, then click Done
            to activate membership and add the payment to daily sales.
          </p>
        </div>

        {awaitingPayment.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-zinc-500">
            No approved walk-in memberships waiting for payment.
          </p>
        ) : (
          <div className="divide-y divide-zinc-800/60">
            {awaitingPayment.map((request) => {
              const confirmed = Boolean(paidConfirmed[request.id]);
              const busy = completingId === request.id;
              return (
                <article key={request.id} className="px-5 py-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold text-white">{request.memberName}</h3>
                        <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-sky-400">
                          Awaiting Cash Payment
                        </span>
                      </div>
                      <p className="text-sm text-zinc-500">{request.memberEmail}</p>
                      <div className="grid gap-1 text-sm sm:grid-cols-2">
                        <p className="text-zinc-400">
                          <span className="text-zinc-600">Plan:</span> {request.planName}
                        </p>
                        <p className="text-zinc-400">
                          <span className="text-zinc-600">Method:</span> Walk-in
                        </p>
                        <p className="text-zinc-400">
                          <span className="text-zinc-600">Ref:</span>{" "}
                          <span className="font-mono text-[#FACC15]">{request.paymentRef}</span>
                        </p>
                        <p className="text-zinc-400">
                          <span className="text-zinc-600">Approved:</span>{" "}
                          {request.reviewedAt ? formatApprovalTime(request.reviewedAt) : "—"}
                        </p>
                      </div>
                      <p className="text-xl font-bold text-[#FACC15]">
                        ₱{request.totalPaid.toLocaleString()}
                      </p>
                    </div>

                    <div className="flex w-full max-w-xs shrink-0 flex-col gap-3">
                      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-800 bg-[#131315] px-3 py-3 text-sm text-zinc-300">
                        <input
                          type="checkbox"
                          checked={confirmed}
                          onChange={(e) =>
                            setPaidConfirmed((prev) => ({
                              ...prev,
                              [request.id]: e.target.checked,
                            }))
                          }
                          className="mt-0.5 h-4 w-4 accent-[#FACC15]"
                        />
                        <span>Member paid in person (cash received)</span>
                      </label>
                      <button
                        type="button"
                        disabled={!confirmed || busy}
                        onClick={() => void handleDone(request.id)}
                        className="rounded-xl bg-[#FACC15] px-5 py-2.5 text-sm font-bold text-black transition hover:bg-[#e6c200] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {busy ? "Activating…" : "Done"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-2xl border border-zinc-800/70 bg-[#0e0e10] p-6"
        >
          <h2 className="text-xl font-bold text-white">Other Walk-in Payments</h2>
          <p className="text-sm text-zinc-500">
            Record day-pass, supplements, renewals, and other front-desk sales.
          </p>

          {error ? (
            <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </p>
          ) : null}

          <div className="space-y-2">
            <p className="text-sm font-medium text-zinc-400">Customer</p>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  { id: "guest", label: "Guest / One-time" },
                  { id: "existing", label: "Existing Member" },
                ] as const
              ).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setCustomerType(option.id)}
                  className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                    customerType === option.id
                      ? "border-[#FACC15] bg-[#FACC15]/10 text-[#FACC15]"
                      : "border-zinc-800 bg-[#131315] text-zinc-400 hover:border-zinc-700"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {customerType === "existing" ? (
            <div className="space-y-2">
              <label htmlFor="member" className="text-sm font-medium text-zinc-400">
                Select Member
              </label>
              <select
                id="member"
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-[#131315] px-4 py-3 text-sm text-white outline-none focus:border-[#FACC15]/40"
              >
                <option value="">Choose a member...</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.firstName} {member.lastName}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="amount" className="text-sm font-medium text-zinc-400">
                Amount (₱)
              </label>
              <input
                id="amount"
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                className="w-full rounded-xl border border-zinc-800 bg-[#131315] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-[#FACC15]/40"
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-zinc-400">Type</p>
              <div className="flex h-[46px] items-center rounded-xl border border-zinc-800 bg-[#131315] px-4 text-sm font-semibold text-[#FACC15]">
                Cash
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="notes" className="text-sm font-medium text-zinc-400">
              Notes (Optional)
            </label>
            <input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Bought water bottle too"
              className="w-full rounded-xl border border-zinc-800 bg-[#131315] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-[#FACC15]/40"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-[#FACC15] py-3.5 text-sm font-bold text-black transition hover:bg-[#e6c200] disabled:opacity-60"
          >
            {submitting ? "Saving…" : submitted ? "Payment Recorded!" : "Record Payment"}
          </button>
        </form>

        <aside className="rounded-2xl border border-zinc-800/70 bg-[#0e0e10] p-5">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-[#FACC15]" />
            <h2 className="font-bold text-white">Today&apos;s Log</h2>
          </div>

          <div className="mt-5 space-y-3">
            {transactions.length === 0 ? (
              <p className="text-sm text-zinc-500">No open payments in today&apos;s running log.</p>
            ) : (
              transactions.map((txn) => (
                <article
                  key={txn.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800/60 bg-[#131315] px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">
                      {getTransactionDisplayLabel(txn.type)}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {txn.member} · {getPaymentMethodLabel(txn.method)} ·{" "}
                      {formatTransactionTime(txn.createdAt)}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-bold text-[#FACC15]">
                    ₱{txn.amount.toLocaleString()}
                  </p>
                </article>
              ))
            )}
          </div>

          <button
            type="button"
            onClick={() => void openCloseModal()}
            disabled={closingBusy}
            className="mt-6 w-full rounded-xl border border-[#FACC15]/50 bg-[#FACC15]/10 py-3 text-sm font-bold text-[#FACC15] transition hover:bg-[#FACC15]/15 disabled:opacity-60"
          >
            Close Daily Sales
          </button>
          {closeError ? <p className="mt-3 text-xs text-red-400">{closeError}</p> : null}
          {closeSuccess ? <p className="mt-3 text-xs text-emerald-400">{closeSuccess}</p> : null}
        </aside>
      </div>

      {showCloseModal && preview ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/70"
            onClick={() => !closingBusy && setShowCloseModal(false)}
            aria-label="Close confirmation"
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-zinc-800 bg-[#0e0e10] p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white">Close Daily Sales?</h3>
            <p className="mt-2 text-sm text-zinc-400">
              Confirm closing today&apos;s open walk-in payments. Transaction history is kept; only
              the running counter resets.
            </p>

            <div className="mt-5 space-y-3 rounded-xl border border-zinc-800 bg-[#131315] px-4 py-4 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-zinc-500">Date</span>
                <span className="font-medium text-white">
                  {new Date(preview.date).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-zinc-500">Total Transactions</span>
                <span className="font-medium text-white">{preview.totalTransactions}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-zinc-500">Total Revenue</span>
                <span className="font-bold text-[#FACC15]">
                  ₱{preview.totalRevenue.toLocaleString()}
                </span>
              </div>
            </div>

            {!preview.canClose ? (
              <p className="mt-4 text-sm text-amber-400">{preview.message}</p>
            ) : null}

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                disabled={closingBusy}
                onClick={() => setShowCloseModal(false)}
                className="flex-1 rounded-xl border border-zinc-700 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-zinc-900 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={closingBusy || !preview.canClose}
                onClick={() => void confirmClose()}
                className="flex-1 rounded-xl bg-[#FACC15] py-2.5 text-sm font-bold text-black hover:bg-[#e6c200] disabled:opacity-60"
              >
                {closingBusy ? "Closing…" : "Confirm Close"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

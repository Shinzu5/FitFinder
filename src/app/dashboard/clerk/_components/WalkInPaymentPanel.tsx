"use client";

import { useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import {
  type PaymentMethod,
  WALK_IN_PAYMENT_OPTIONS,
  useClerkStore,
} from "@/stores/clerk-store";
import { formatTransactionTime, getPaymentMethodLabel, getTransactionDisplayLabel } from "@/stores/clerk-store";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

type CustomerType = "guest" | "existing";

export function WalkInPaymentPanel() {
  const members = useClerkStore((state) => state.members);
  const transactions = useClerkStore((state) => state.transactions);
  const recordPayment = useClerkStore((state) => state.recordPayment);

  const [customerType, setCustomerType] = useState<CustomerType>("guest");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [paymentOptionId, setPaymentOptionId] = useState("day-pass");
  const [amount, setAmount] = useState("150");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const selectedOption = useMemo(
    () => WALK_IN_PAYMENT_OPTIONS.find((opt) => opt.id === paymentOptionId) ?? WALK_IN_PAYMENT_OPTIONS[0],
    [paymentOptionId],
  );

  const todayLog = useMemo(() => {
    const todayStart = startOfToday();
    return transactions.filter((txn) => txn.createdAt >= todayStart);
  }, [transactions]);

  function handlePaymentTypeChange(optionId: string) {
    const option = WALK_IN_PAYMENT_OPTIONS.find((opt) => opt.id === optionId);
    if (!option) return;
    setPaymentOptionId(optionId);
    setAmount(String(option.defaultAmount));
  }

  function getMemberName() {
    if (customerType === "guest") return "Guest";
    const member = members.find((m) => m.id === selectedMemberId);
    return member ? `${member.firstName} ${member.lastName}` : "Guest";
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) return;
    if (customerType === "existing" && !selectedMemberId) return;

    recordPayment({
      type: selectedOption.transactionType,
      member: getMemberName(),
      amount: parsedAmount,
      method,
      notes,
    });

    setNotes("");
    setSubmitted(true);
    window.setTimeout(() => setSubmitted(false), 2000);
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.4fr_0.6fr]">
      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-2xl border border-zinc-800/70 bg-[#0e0e10] p-6"
      >
        <h2 className="text-xl font-bold text-white">Record Walk-in Payment</h2>

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

        <div className="space-y-2">
          <p className="text-sm font-medium text-zinc-400">Payment Type</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {WALK_IN_PAYMENT_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => handlePaymentTypeChange(option.id)}
                className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                  paymentOptionId === option.id
                    ? "border-[#FACC15] bg-[#FACC15]/10 text-[#FACC15]"
                    : "border-zinc-800 bg-[#131315] text-zinc-300 hover:border-zinc-700"
                }`}
              >
                {option.label}
                <span className="mt-0.5 block text-xs font-normal text-zinc-500">
                  ₱{option.defaultAmount.toLocaleString()}
                </span>
              </button>
            ))}
          </div>
        </div>

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
              className="w-full rounded-xl border border-zinc-800 bg-[#131315] px-4 py-3 text-sm text-white outline-none focus:border-[#FACC15]/40"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="method" className="text-sm font-medium text-zinc-400">
              Method
            </label>
            <select
              id="method"
              value={method}
              onChange={(e) => setMethod(e.target.value as PaymentMethod)}
              className="w-full rounded-xl border border-zinc-800 bg-[#131315] px-4 py-3 text-sm text-white outline-none focus:border-[#FACC15]/40"
            >
              <option value="cash">Cash</option>
              <option value="cashless">Cashless</option>
            </select>
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
          className="w-full rounded-xl bg-[#FACC15] py-3.5 text-sm font-bold text-black transition hover:bg-[#e6c200]"
        >
          {submitted ? "Payment Recorded!" : "Record Payment"}
        </button>
      </form>

      <aside className="rounded-2xl border border-zinc-800/70 bg-[#0e0e10] p-5">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-[#FACC15]" />
          <h2 className="font-bold text-white">Today&apos;s Log</h2>
        </div>

        <div className="mt-5 space-y-3">
          {todayLog.length === 0 ? (
            <p className="text-sm text-zinc-500">No payments recorded today yet.</p>
          ) : (
            todayLog.map((txn) => (
              <article
                key={txn.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800/60 bg-[#131315] px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">
                    {getTransactionDisplayLabel(txn.type)}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {getPaymentMethodLabel(txn.method)} · {formatTransactionTime(txn.createdAt)}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-bold text-[#FACC15]">
                  ₱{txn.amount.toLocaleString()}
                </p>
              </article>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}

"use client";

import { useClerkStore } from "@/stores/clerk-store";
import {
  formatApprovalTime,
  useWalkInApprovalsStore,
} from "@/stores/walk-in-approvals-store";

export function ClerkApprovalsPanel() {
  const requests = useWalkInApprovalsStore((state) => state.requests);
  const approveRequest = useWalkInApprovalsStore((state) => state.approveRequest);
  const declineRequest = useWalkInApprovalsStore((state) => state.declineRequest);
  const recordPayment = useClerkStore((state) => state.recordPayment);
  const addMemberFromApproval = useClerkStore((state) => state.addMemberFromApproval);
  const members = useClerkStore((state) => state.members);

  const pending = requests.filter((req) => req.status === "pending");
  const reviewed = requests.filter((req) => req.status !== "pending");

  function handleApprove(id: string) {
    const approved = approveRequest(id);
    if (!approved) return;

    recordPayment({
      type: "monthly",
      member: approved.memberName,
      amount: approved.totalPaid,
      method: "cash",
      notes: `Walk-in approval · Ref ${approved.paymentRef}`,
    });

    const nameParts = approved.memberName.trim().split(/\s+/);
    const firstName = nameParts[0] ?? approved.memberName;
    const lastName = nameParts.slice(1).join(" ") || "Member";
    const alreadyMember = members.some(
      (member) =>
        `${member.firstName} ${member.lastName}`.toLowerCase() ===
        approved.memberName.toLowerCase(),
    );

    if (!alreadyMember) {
      addMemberFromApproval({
        firstName,
        lastName,
        email: approved.memberEmail,
        plan: approved.planName,
        planPrice: approved.totalPaid,
      });
    }
  }

  function handleDecline(id: string) {
    declineRequest(id);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Walk-in Approvals</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Review newcomers who chose walk-in payment and are waiting for front desk confirmation.
        </p>
      </div>

      <section className="overflow-hidden rounded-2xl border border-zinc-800/70 bg-[#0e0e10]">
        <div className="flex items-center justify-between gap-4 border-b border-zinc-800/70 px-5 py-4">
          <h3 className="font-bold text-white">
            Pending
            {pending.length > 0 ? (
              <span className="ml-2 rounded-full bg-[#FACC15]/15 px-2 py-0.5 text-xs font-bold text-[#FACC15]">
                {pending.length}
              </span>
            ) : null}
          </h3>
        </div>

        {pending.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-zinc-500">
            No pending walk-in requests right now.
          </p>
        ) : (
          <div className="divide-y divide-zinc-800/60">
            {pending.map((request) => (
              <article key={request.id} className="px-5 py-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-lg font-bold text-white">{request.memberName}</h4>
                      <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-400">
                        Awaiting Payment
                      </span>
                    </div>
                    <p className="text-sm text-zinc-500">{request.memberEmail}</p>

                    <div className="grid gap-2 text-sm sm:grid-cols-2">
                      <p className="text-zinc-400">
                        <span className="text-zinc-600">Gym:</span> {request.gymName}
                      </p>
                      <p className="text-zinc-400">
                        <span className="text-zinc-600">Plan:</span> {request.planName}
                      </p>
                      <p className="text-zinc-400">
                        <span className="text-zinc-600">Reference:</span>{" "}
                        <span className="font-mono text-[#FACC15]">{request.paymentRef}</span>
                      </p>
                      <p className="text-zinc-400">
                        <span className="text-zinc-600">Submitted:</span>{" "}
                        {formatApprovalTime(request.submittedAt)}
                      </p>
                      {request.coachName ? (
                        <p className="text-zinc-400 sm:col-span-2">
                          <span className="text-zinc-600">Coach:</span> {request.coachName}
                        </p>
                      ) : null}
                    </div>

                    <p className="text-xl font-bold text-[#FACC15]">
                      ₱{request.totalPaid.toLocaleString()}
                      <span className="ml-2 text-sm font-medium text-zinc-500">to collect</span>
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => handleApprove(request.id)}
                      className="rounded-xl bg-[#FACC15] px-5 py-2.5 text-sm font-bold text-black transition hover:bg-[#e6c200]"
                    >
                      Confirm Payment
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDecline(request.id)}
                      className="rounded-xl border border-red-500/50 px-5 py-2.5 text-sm font-bold text-red-400 transition hover:bg-red-500/10"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {reviewed.length > 0 ? (
        <section className="overflow-hidden rounded-2xl border border-zinc-800/70 bg-[#0e0e10]">
          <div className="border-b border-zinc-800/70 px-5 py-4">
            <h3 className="font-bold text-white">Recently Reviewed</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800/80 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  <th className="px-5 py-4">Member</th>
                  <th className="px-5 py-4">Plan</th>
                  <th className="px-5 py-4">Amount</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Reviewed</th>
                </tr>
              </thead>
              <tbody>
                {reviewed.slice(0, 8).map((request) => (
                  <tr key={request.id} className="border-b border-zinc-800/50 last:border-0">
                    <td className="px-5 py-4 font-semibold text-white">{request.memberName}</td>
                    <td className="px-5 py-4 text-zinc-400">{request.planName}</td>
                    <td className="px-5 py-4 font-bold text-[#FACC15]">
                      ₱{request.totalPaid.toLocaleString()}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                          request.status === "approved"
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                            : "border-red-500/30 bg-red-500/10 text-red-400"
                        }`}
                      >
                        {request.status === "approved" ? "Confirmed" : "Declined"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-zinc-500">
                      {request.reviewedAt ? formatApprovalTime(request.reviewedAt) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}

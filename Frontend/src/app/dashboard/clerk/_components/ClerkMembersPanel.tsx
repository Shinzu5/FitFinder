"use client";

import { useEffect, useMemo, useState } from "react";
import { type MemberStatus, useClerkStore } from "@/stores/clerk-store";

function StatusBadge({ status }: { status: MemberStatus }) {
  const isActive = status === "active";
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
        isActive
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
          : status === "expiring"
            ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
            : "border-red-500/30 bg-red-500/10 text-red-400"
      }`}
    >
      {isActive ? "Active" : status === "expiring" ? "Expiring Soon" : "Expired"}
    </span>
  );
}

function RemainingDays({ days }: { days: number }) {
  if (days <= 0) {
    return <span className="font-semibold text-red-400">0 days left</span>;
  }
  if (days <= 7) {
    return <span className="font-semibold text-amber-400">{days} days left</span>;
  }
  return <span className="font-semibold text-emerald-400">{days} days left</span>;
}

function formatDate(ms?: number) {
  if (!ms) return "—";
  return new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ClerkMembersPanel() {
  const members = useClerkStore((state) => state.members);
  const loading = useClerkStore((state) => state.loading);
  const fetchMembers = useClerkStore((state) => state.fetchMembers);
  const [filter, setFilter] = useState<"all" | MemberStatus>("all");

  useEffect(() => {
    void fetchMembers();
  }, [fetchMembers]);

  const filteredMembers = useMemo(() => {
    if (filter === "all") return members;
    return members.filter((member) => member.status === filter);
  }, [filter, members]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-white">Gym Members</h2>
        <div className="flex gap-2">
          {(
            [
              { id: "all", label: "All" },
              { id: "active", label: "Active" },
              { id: "expiring", label: "Expiring Soon" },
            ] as const
          ).map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setFilter(option.id)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                filter === option.id
                  ? "border border-zinc-700 bg-zinc-800 text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-zinc-800/70 bg-[#0e0e10]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-800/80 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <th className="px-5 py-4 font-semibold">Member</th>
                <th className="px-5 py-4 font-semibold">Type</th>
                <th className="px-5 py-4 font-semibold">Plan</th>
                <th className="px-5 py-4 font-semibold">Remaining</th>
                <th className="px-5 py-4 font-semibold">Dates</th>
                <th className="px-5 py-4 font-semibold">Payment</th>
                <th className="px-5 py-4 font-semibold">Registered By</th>
                <th className="px-5 py-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && members.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-zinc-500">
                    Loading members…
                  </td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-zinc-500">
                    No members found.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => (
                  <tr key={member.id} className="border-b border-zinc-800/50 last:border-0">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-white">
                        {member.fullName || `${member.firstName} ${member.lastName}`.trim()}
                      </p>
                      {member.email ? (
                        <p className="mt-0.5 text-xs text-zinc-500">{member.email}</p>
                      ) : null}
                    </td>
                    <td className="px-5 py-4 text-zinc-300">{member.memberType || "Walk-in"}</td>
                    <td className="px-5 py-4">
                      <span className="font-medium text-[#FACC15]">{member.plan}</span>
                      <span className="ml-1 text-xs text-zinc-500">
                        · ₱{member.planPrice.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <RemainingDays days={member.remainingDays} />
                    </td>
                    <td className="px-5 py-4 text-xs text-zinc-400">
                      <p>Start: {formatDate(member.startsAt)}</p>
                      <p>Ends: {formatDate(member.expiresAt)}</p>
                      <p>Reg: {formatDate(member.registrationDate || member.joinedAt)}</p>
                    </td>
                    <td className="px-5 py-4 font-medium text-zinc-200">
                      ₱{(member.totalPaid ?? 0).toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-zinc-300">{member.registeredBy || "Self"}</td>
                    <td className="px-5 py-4">
                      <StatusBadge status={member.status} />
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

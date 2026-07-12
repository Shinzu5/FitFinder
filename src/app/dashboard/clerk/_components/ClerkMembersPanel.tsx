"use client";

import { useMemo, useState } from "react";
import { type MemberStatus, useClerkStore } from "@/stores/clerk-store";

function StatusBadge({ status }: { status: MemberStatus }) {
  const isActive = status === "active";
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
        isActive
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
          : "border-amber-500/30 bg-amber-500/10 text-amber-400"
      }`}
    >
      {isActive ? "Active" : "Expiring Soon"}
    </span>
  );
}

export function ClerkMembersPanel() {
  const members = useClerkStore((state) => state.members);
  const [filter, setFilter] = useState<"all" | MemberStatus>("all");

  const filteredMembers = useMemo(() => {
    if (filter === "all") return members;
    return members.filter((member) => member.status === filter);
  }, [filter, members]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
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
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-800/80 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <th className="px-5 py-4 font-semibold">Member</th>
                <th className="px-5 py-4 font-semibold">Phone</th>
                <th className="px-5 py-4 font-semibold">Plan</th>
                <th className="px-5 py-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-zinc-500">
                    No members found.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => (
                  <tr key={member.id} className="border-b border-zinc-800/50 last:border-0">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-white">
                        {member.firstName} {member.lastName}
                      </p>
                      {member.email ? (
                        <p className="mt-0.5 text-xs text-zinc-500">{member.email}</p>
                      ) : null}
                    </td>
                    <td className="px-5 py-4 text-zinc-400">{member.phone}</td>
                    <td className="px-5 py-4">
                      <span className="font-medium text-[#FACC15]">{member.plan}</span>
                      <span className="ml-1 text-xs text-zinc-500">
                        · ₱{member.planPrice.toLocaleString()}
                      </span>
                    </td>
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

"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { getClerkInitials, useOwnerStaffStore } from "@/stores/owner-staff-store";
import { AddClerkModal } from "./AddClerkModal";
import { RevenueChart } from "./RevenueChart";

const STATS = [
  { label: "Active Members", value: "142", highlight: false },
  { label: "Monthly Revenue", value: "₱180,000", highlight: false },
  { label: "Walk-ins Today", value: "12", highlight: false },
  { label: "Unread Messages", value: "3", highlight: true },
] as const;

export function OverviewPanel() {
  const clerks = useOwnerStaffStore((state) => state.clerks);
  const removeClerk = useOwnerStaffStore((state) => state.removeClerk);
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {STATS.map((stat) => (
            <article
              key={stat.label}
              className="rounded-2xl border border-white/10 bg-[#141414] px-5 py-4"
            >
              <p className="text-sm text-zinc-400">{stat.label}</p>
              <p
                className={`mt-2 text-3xl font-bold ${
                  stat.highlight ? "text-[#FFD700]" : "text-white"
                }`}
              >
                {stat.value}
              </p>
            </article>
          ))}
        </div>

        <RevenueChart />

        <section className="rounded-2xl border border-white/10 bg-[#141414] p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-white">Front Desk Staff</h2>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-[#FFD700] px-4 py-2 text-sm font-bold text-black transition hover:bg-[#e6c200]"
            >
              <Plus className="h-4 w-4" />
              Add Clerk
            </button>
          </div>

          <div className="space-y-3">
            {clerks.length === 0 ? (
              <p className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-zinc-500">
                No front desk staff yet. Click Add Clerk to invite someone.
              </p>
            ) : (
              clerks.map((clerk) => (
                <article
                  key={clerk.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#0f0f0f] px-4 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FFD700]/20 text-sm font-semibold text-[#FFD700]">
                      {getClerkInitials(clerk.fullName)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-white">{clerk.fullName}</p>
                      <p className="truncate text-sm text-zinc-500">{clerk.email}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeClerk(clerk.id)}
                    className="shrink-0 rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-red-400 transition hover:bg-red-500/10"
                  >
                    Delete
                  </button>
                </article>
              ))
            )}
          </div>
        </section>
      </div>

      <AddClerkModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}

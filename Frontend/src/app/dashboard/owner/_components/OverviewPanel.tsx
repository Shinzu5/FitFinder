"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useClerkStore } from "@/stores/clerk-store";
import { useOwnerMessagesStore } from "@/stores/owner-messages-store";
import { getClerkInitials, useOwnerStaffStore } from "@/stores/owner-staff-store";
import { useAuthStore } from "@/stores/auth-store";
import { AddClerkModal } from "./AddClerkModal";
import { RevenueChart } from "./RevenueChart";

export function OverviewPanel() {
  const clerks = useOwnerStaffStore((state) => state.clerks);
  const fetchStaff = useOwnerStaffStore((state) => state.fetchStaff);
  const removeClerk = useOwnerStaffStore((state) => state.removeClerk);

  const activeNow = useClerkStore((state) => state.activeNow);
  const monthlyRevenue = useClerkStore((state) => state.monthlyRevenue);
  const walkInsToday = useClerkStore((state) => state.walkInsToday);
  const revenueByMonth = useClerkStore((state) => state.revenueByMonth);
  const dashboardLoading = useClerkStore((state) => state.loading);
  const fetchDashboard = useClerkStore((state) => state.fetchDashboard);

  const contacts = useOwnerMessagesStore((state) => state.contacts);
  const fetchConversations = useOwnerMessagesStore((state) => state.fetchConversations);
  const setCurrentUserId = useOwnerMessagesStore((state) => state.setCurrentUserId);
  const authUserId = useAuthStore((state) => state.user?.id);

  const [modalOpen, setModalOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (authUserId) setCurrentUserId(authUserId);
  }, [authUserId, setCurrentUserId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await Promise.all([fetchStaff(), fetchDashboard(), fetchConversations()]);
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchStaff, fetchDashboard, fetchConversations]);

  const unreadMessages = useMemo(
    () => contacts.reduce((sum, c) => sum + (c.unreadCount || 0), 0),
    [contacts],
  );

  const stats = [
    {
      label: "Active Now",
      value: ready || !dashboardLoading ? String(activeNow) : "…",
      highlight: false,
    },
    {
      label: "Monthly Revenue",
      value:
        ready || !dashboardLoading ? `₱${Math.round(monthlyRevenue).toLocaleString()}` : "…",
      highlight: false,
    },
    {
      label: "Walk-ins Today",
      value: ready || !dashboardLoading ? String(walkInsToday) : "…",
      highlight: false,
    },
    {
      label: "Unread Messages",
      value: ready ? String(unreadMessages) : "…",
      highlight: true,
    },
  ];

  return (
    <>
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
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

        <RevenueChart points={revenueByMonth} />

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

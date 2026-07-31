"use client";

import { useEffect } from "react";
import { useAdminStore, formatActivityTime } from "@/stores/admin-store";
import { AdminRevenueChart } from "./AdminRevenueChart";

function ActivityDot({ tone }: { tone: "success" | "info" | "warning" }) {
  const colors = {
    success: "bg-emerald-400",
    info: "bg-blue-400",
    warning: "bg-[#FACC15]",
  };
  return <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${colors[tone]}`} />;
}

export function AdminOverviewPanel() {
  const platformRevenue = useAdminStore((state) => state.platformRevenue);
  const totalUsers = useAdminStore((state) => state.totalUsers);
  const totalGyms = useAdminStore((state) => state.totalGyms);
  const activity = useAdminStore((state) => state.activity);
  const loading = useAdminStore((state) => state.loading);
  const fetchDashboard = useAdminStore((state) => state.fetchDashboard);

  useEffect(() => {
    void fetchDashboard();
  }, [fetchDashboard]);

  const statCards = [
    {
      label: "Total Gyms",
      value: loading ? "…" : String(totalGyms),
      sub: "Active gyms on platform",
      highlight: false,
    },
    {
      label: "Total Users",
      value: loading ? "…" : totalUsers.toLocaleString(),
      sub: "Registered accounts",
      highlight: false,
    },
    {
      label: "Platform Revenue",
      value: loading ? "…" : `₱${platformRevenue.toLocaleString()}`,
      sub: "Owner subscriptions",
      highlight: false,
    },
    {
      label: "Active Gyms",
      value: loading ? "…" : String(totalGyms),
      sub: "Published automatically after Owner plan purchase",
      highlight: true,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat) => (
          <article
            key={stat.label}
            className={`rounded-2xl border bg-[#0e0e10] px-5 py-5 ${
              stat.highlight
                ? "border-[#FACC15]/50 shadow-[0_0_30px_rgba(250,204,21,0.08)]"
                : "border-zinc-800/70"
            }`}
          >
            <p className="text-sm text-zinc-500">{stat.label}</p>
            <p
              className={`mt-2 text-3xl font-bold ${
                stat.highlight ? "text-[#FACC15]" : "text-white"
              }`}
            >
              {stat.value}
            </p>
            <p
              className={`mt-1 text-xs font-medium ${
                stat.highlight ? "text-[#FACC15]/80" : "text-emerald-400"
              }`}
            >
              {stat.sub}
            </p>
          </article>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
        <AdminRevenueChart />

        <section className="rounded-2xl border border-zinc-800/70 bg-[#0e0e10] p-5">
          <h2 className="mb-4 text-lg font-bold text-white">Recent Activity</h2>
          <div className="space-y-4">
            {activity.length === 0 ? (
              <p className="text-sm text-zinc-500">No recent activity yet.</p>
            ) : (
              activity.map((item) => (
                <div key={item.id} className="flex items-start gap-3">
                  <ActivityDot tone={item.tone} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-zinc-200">{item.message}</p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {formatActivityTime(item.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

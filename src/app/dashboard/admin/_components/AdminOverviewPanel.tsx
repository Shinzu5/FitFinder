"use client";

import Link from "next/link";
import { useAdminStore, formatActivityTime } from "@/stores/admin-store";
import { useAdminGymApprovalsStore } from "@/stores/admin-gym-approvals-store";
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
  const totalUsersBase = useAdminStore((state) => state.totalUsersBase);
  const activity = useAdminStore((state) => state.activity);
  const applications = useAdminGymApprovalsStore((state) => state.applications);

  const pendingApprovals = applications.filter((app) => app.status === "pending").length;
  const approvedApps = applications.filter((app) => app.status === "approved").length;
  const totalGyms = 139 + approvedApps;

  const statCards = [
    {
      label: "Total Gyms",
      value: String(totalGyms),
      sub: "+12 this month",
      highlight: false,
      bordered: false,
    },
    {
      label: "Total Users",
      value: totalUsersBase.toLocaleString(),
      sub: "+890 this month",
      highlight: false,
      bordered: false,
    },
    {
      label: "Platform Revenue",
      value: `$${platformRevenue.toLocaleString()}`,
      sub: "+18% this month",
      highlight: false,
      bordered: false,
    },
    {
      label: "Pending Approvals",
      value: String(pendingApprovals),
      sub: "Requires attention",
      highlight: true,
      bordered: true,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat) => (
          <article
            key={stat.label}
            className={`rounded-2xl border bg-[#0e0e10] px-5 py-5 ${
              stat.bordered
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
            {stat.bordered && pendingApprovals > 0 ? (
              <Link
                href="/dashboard/admin/gym-approvals"
                className="mt-3 inline-flex text-xs font-semibold text-[#FACC15] hover:underline"
              >
                Review approvals →
              </Link>
            ) : null}
          </article>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
        <AdminRevenueChart />

        <section className="rounded-2xl border border-zinc-800/70 bg-[#0e0e10] p-5">
          <h2 className="mb-4 text-lg font-bold text-white">Recent Activity</h2>
          <div className="space-y-4">
            {activity.map((item) => (
              <div key={item.id} className="flex items-start gap-3">
                <ActivityDot tone={item.tone} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-zinc-200">{item.message}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {formatActivityTime(item.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

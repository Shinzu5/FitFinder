"use client";

import { useCallback, useEffect, useState } from "react";
import { useAdminAnalyticsStore } from "@/stores/admin-analytics-store";
import { useAdminRealtimeSync } from "@/hooks/useAdminRealtimeSync";

const CHART_WIDTH = 520;
const CHART_HEIGHT = 240;
const PADDING = { top: 16, right: 20, bottom: 32, left: 48 };

function scaleY(value: number, max: number) {
  const innerHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;
  if (max <= 0) return PADDING.top + innerHeight;
  return PADDING.top + innerHeight - (value / max) * innerHeight;
}

function scaleX(index: number, count: number) {
  const innerWidth = CHART_WIDTH - PADDING.left - PADDING.right;
  if (count <= 1) return PADDING.left + innerWidth / 2;
  return PADDING.left + (index / (count - 1)) * innerWidth;
}

function MembershipGrowthChart() {
  const growth = useAdminAnalyticsStore((state) => state.membershipGrowth);
  const labels = growth.map((item) => item.label);
  const values = growth.map((item) => item.value);
  const max = Math.max(...values, 1);
  const yTicks = [0, max * 0.25, max * 0.5, max * 0.75, max];

  if (labels.length === 0) {
    return (
      <section className="rounded-2xl border border-zinc-800/70 bg-[#0e0e10] p-5">
        <h3 className="mb-5 text-lg font-bold text-white">Membership Growth (6mo)</h3>
        <p className="py-16 text-center text-sm text-zinc-500">No membership joins yet.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-zinc-800/70 bg-[#0e0e10] p-5">
      <h3 className="mb-5 text-lg font-bold text-white">Membership Growth (6mo)</h3>
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-label="Membership growth over the last six months"
      >
        <defs>
          <linearGradient id="membershipGrowthFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FACC15" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#FACC15" stopOpacity="0" />
          </linearGradient>
        </defs>

        {yTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={PADDING.left}
              y1={scaleY(tick, max)}
              x2={CHART_WIDTH - PADDING.right}
              y2={scaleY(tick, max)}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="1"
            />
            <text
              x={PADDING.left - 10}
              y={scaleY(tick, max) + 4}
              textAnchor="end"
              className="fill-zinc-500 text-[10px]"
            >
              {Math.round(tick)}
            </text>
          </g>
        ))}

        <polygon
          points={[
            `${scaleX(0, labels.length)},${scaleY(0, max)}`,
            ...values.map(
              (value, index) => `${scaleX(index, labels.length)},${scaleY(value, max)}`,
            ),
            `${scaleX(labels.length - 1, labels.length)},${scaleY(0, max)}`,
          ].join(" ")}
          fill="url(#membershipGrowthFill)"
        />
        <polyline
          points={values
            .map((value, index) => `${scaleX(index, labels.length)},${scaleY(value, max)}`)
            .join(" ")}
          fill="none"
          stroke="#FACC15"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {values.map((value, index) => (
          <circle
            key={`${labels[index]}-${index}`}
            cx={scaleX(index, labels.length)}
            cy={scaleY(value, max)}
            r="4"
            fill="#FACC15"
          />
        ))}

        {labels.map((label, index) => (
          <text
            key={`${label}-${index}`}
            x={scaleX(index, labels.length)}
            y={CHART_HEIGHT - 10}
            textAnchor="middle"
            className="fill-zinc-500 text-[11px]"
          >
            {label}
          </text>
        ))}
      </svg>
    </section>
  );
}

const BAR_CHART_HEIGHT = 280;
const BAR_LABEL_WIDTH = 96;
const BAR_AREA_WIDTH = 360;
const BAR_HEIGHT = 28;
const BAR_GAP = 18;

function MostActiveGymsChart() {
  const [hovered, setHovered] = useState<string | null>(null);
  const topGyms = useAdminAnalyticsStore((state) => state.topGyms);
  const maxMembers = Math.max(...topGyms.map((gym) => gym.members), 1);
  const tickMax = Math.max(Math.ceil(maxMembers / 4) * 4, 4);
  const ticks = [0, tickMax * 0.25, tickMax * 0.5, tickMax * 0.75, tickMax];

  if (topGyms.length === 0) {
    return (
      <section className="rounded-2xl border border-zinc-800/70 bg-[#0e0e10] p-5">
        <h3 className="mb-5 text-lg font-bold text-white">Most Active Gyms</h3>
        <p className="py-16 text-center text-sm text-zinc-500">No gyms with members yet.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-zinc-800/70 bg-[#0e0e10] p-5">
      <h3 className="mb-5 text-lg font-bold text-white">Most Active Gyms</h3>
      <div className="relative">
        <svg
          viewBox={`0 0 ${BAR_LABEL_WIDTH + BAR_AREA_WIDTH + 24} ${BAR_CHART_HEIGHT}`}
          className="h-auto w-full"
          role="img"
          aria-label="Most active gyms by member count"
        >
          {ticks.map((tick) => {
            const x = BAR_LABEL_WIDTH + (tick / tickMax) * BAR_AREA_WIDTH;
            return (
              <g key={tick}>
                <line
                  x1={x}
                  y1={12}
                  x2={x}
                  y2={BAR_CHART_HEIGHT - 24}
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth="1"
                />
                <text
                  x={x}
                  y={BAR_CHART_HEIGHT - 6}
                  textAnchor="middle"
                  className="fill-zinc-500 text-[10px]"
                >
                  {Math.round(tick)}
                </text>
              </g>
            );
          })}

          {topGyms.slice(0, 5).map((gym, index) => {
            const y = 20 + index * (BAR_HEIGHT + BAR_GAP);
            const barWidth = (gym.members / maxMembers) * BAR_AREA_WIDTH;
            const isHovered = hovered === gym.id;

            return (
              <g
                key={gym.id}
                onMouseEnter={() => setHovered(gym.id)}
                onMouseLeave={() => setHovered(null)}
                className="cursor-pointer"
              >
                <text
                  x={BAR_LABEL_WIDTH - 8}
                  y={y + BAR_HEIGHT / 2 + 4}
                  textAnchor="end"
                  className="fill-zinc-400 text-[11px]"
                >
                  {gym.name.length > 12 ? `${gym.name.slice(0, 12)}…` : gym.name}
                </text>
                <rect
                  x={BAR_LABEL_WIDTH}
                  y={y}
                  width={Math.max(barWidth, 2)}
                  height={BAR_HEIGHT}
                  rx="6"
                  fill={isHovered ? "#FDE047" : "#FACC15"}
                  opacity={isHovered ? 1 : 0.9}
                />
              </g>
            );
          })}
        </svg>

        {hovered ? (
          (() => {
            const gym = topGyms.find((item) => item.id === hovered);
            if (!gym) return null;
            return (
              <div className="pointer-events-none absolute bottom-6 right-4 rounded-lg border border-zinc-700 bg-[#1a1a1c] px-3 py-2 text-xs shadow-xl">
                <p className="font-semibold text-white">{gym.name}</p>
                <p className="mt-0.5 text-zinc-400">members : {gym.members}</p>
              </div>
            );
          })()
        ) : null}
      </div>
    </section>
  );
}

function StatCard({
  label,
  value,
  sub,
  highlight = false,
}: {
  label: string;
  value: string;
  sub: string;
  highlight?: boolean;
}) {
  return (
    <article
      className={`rounded-2xl border bg-[#0e0e10] px-4 py-4 sm:px-5 sm:py-5 ${
        highlight
          ? "border-[#FACC15]/50 shadow-[0_0_30px_rgba(250,204,21,0.08)]"
          : "border-zinc-800/70"
      }`}
    >
      <p className="text-sm text-zinc-500">{label}</p>
      <p
        className={`mt-2 text-2xl font-bold sm:text-3xl ${
          highlight ? "text-[#FACC15]" : "text-white"
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-xs font-medium text-emerald-400">{sub}</p>
    </article>
  );
}

function growthLabel(pct: number) {
  if (pct > 0) return `↑ ${pct}% vs last month`;
  if (pct < 0) return `↓ ${Math.abs(pct)}% vs last month`;
  return "No change vs last month";
}

export function AdminAnalyticsPanel() {
  const metrics = useAdminAnalyticsStore((state) => state.metrics);
  const loading = useAdminAnalyticsStore((state) => state.loading);
  const error = useAdminAnalyticsStore((state) => state.error);
  const fetchAnalytics = useAdminAnalyticsStore((state) => state.fetchAnalytics);

  useEffect(() => {
    void fetchAnalytics();
  }, [fetchAnalytics]);

  const onRealtime = useCallback(() => {
    void fetchAnalytics({ silent: true });
  }, [fetchAnalytics]);

  useAdminRealtimeSync(onRealtime);

  const statCards = [
    {
      label: "Total Users",
      value: loading ? "…" : metrics.totalUsers.toLocaleString(),
      sub: growthLabel(metrics.userGrowthPct),
    },
    {
      label: "Gym Owners",
      value: loading ? "…" : String(metrics.totalOwners),
      sub: `${metrics.newGymsThisMonth} new gym${metrics.newGymsThisMonth === 1 ? "" : "s"} this month`,
    },
    {
      label: "Total Members",
      value: loading ? "…" : metrics.activeMembers.toLocaleString(),
      sub: "Active & expiring memberships",
    },
    {
      label: "Active Plans",
      value: loading ? "…" : metrics.activeSubscriptions.toLocaleString(),
      sub: "Owner subscriptions not expired",
    },
    {
      label: "Monthly Rev",
      value: loading ? "…" : `₱${metrics.monthRevenue.toLocaleString()}`,
      sub: growthLabel(metrics.revenueGrowthPct),
      highlight: true,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <h2 className="text-2xl font-bold text-white">Platform Analytics</h2>

      {error ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {statCards.map((stat) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            sub={stat.sub}
            highlight={stat.highlight}
          />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <MembershipGrowthChart />
        <MostActiveGymsChart />
      </div>
    </div>
  );
}

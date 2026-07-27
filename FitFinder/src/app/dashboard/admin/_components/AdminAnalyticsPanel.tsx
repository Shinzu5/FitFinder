"use client";

import { useState } from "react";
import {
  MEMBERSHIP_GROWTH,
  MOST_ACTIVE_GYMS,
  useAdminAnalyticsStore,
} from "@/stores/admin-analytics-store";

const Y_TICKS = [0, 15, 30, 45, 60];
const CHART_WIDTH = 520;
const CHART_HEIGHT = 240;
const PADDING = { top: 16, right: 20, bottom: 32, left: 48 };
const MAX_MEMBERS = 60;

function scaleY(value: number, max: number) {
  const innerHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;
  return PADDING.top + innerHeight - (value / max) * innerHeight;
}

function scaleX(index: number, count: number) {
  const innerWidth = CHART_WIDTH - PADDING.left - PADDING.right;
  return PADDING.left + (index / (count - 1)) * innerWidth;
}

function MembershipGrowthChart() {
  const months = MEMBERSHIP_GROWTH.map((item) => item.month);
  const values = MEMBERSHIP_GROWTH.map((item) => item.value);

  const points = values
    .map((value, index) => `${scaleX(index, months.length)},${scaleY(value, MAX_MEMBERS)}`)
    .join(" ");
  const areaPoints = [
    `${scaleX(0, months.length)},${scaleY(0, MAX_MEMBERS)}`,
    ...values.map((value, index) => `${scaleX(index, months.length)},${scaleY(value, MAX_MEMBERS)}`),
    `${scaleX(months.length - 1, months.length)},${scaleY(0, MAX_MEMBERS)}`,
  ].join(" ");

  return (
    <section className="rounded-2xl border border-zinc-800/70 bg-[#0e0e10] p-5">
      <h3 className="mb-5 text-lg font-bold text-white">Membership Growth (6mo)</h3>
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-label="Membership growth from January to June"
      >
        <defs>
          <linearGradient id="membershipGrowthFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FACC15" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#FACC15" stopOpacity="0" />
          </linearGradient>
        </defs>

        {Y_TICKS.map((tick) => (
          <g key={tick}>
            <line
              x1={PADDING.left}
              y1={scaleY(tick, MAX_MEMBERS)}
              x2={CHART_WIDTH - PADDING.right}
              y2={scaleY(tick, MAX_MEMBERS)}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="1"
            />
            <text
              x={PADDING.left - 10}
              y={scaleY(tick, MAX_MEMBERS) + 4}
              textAnchor="end"
              className="fill-zinc-500 text-[10px]"
            >
              {tick}k
            </text>
          </g>
        ))}

        <polygon points={areaPoints} fill="url(#membershipGrowthFill)" />
        <polyline
          points={points}
          fill="none"
          stroke="#FACC15"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {values.map((value, index) => (
          <circle
            key={months[index]}
            cx={scaleX(index, months.length)}
            cy={scaleY(value, MAX_MEMBERS)}
            r="4"
            fill="#FACC15"
          />
        ))}

        {months.map((month, index) => (
          <text
            key={month}
            x={scaleX(index, months.length)}
            y={CHART_HEIGHT - 10}
            textAnchor="middle"
            className="fill-zinc-500 text-[11px]"
          >
            {month}
          </text>
        ))}
      </svg>
    </section>
  );
}

const BAR_MAX = 360;
const BAR_CHART_HEIGHT = 280;
const BAR_LABEL_WIDTH = 96;
const BAR_AREA_WIDTH = 360;
const BAR_HEIGHT = 28;
const BAR_GAP = 18;

function MostActiveGymsChart() {
  const [hovered, setHovered] = useState<string | null>(null);
  const maxMembers = Math.max(...MOST_ACTIVE_GYMS.map((gym) => gym.members));

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
          {[0, 90, 180, 270, 360].map((tick) => {
            const x = BAR_LABEL_WIDTH + (tick / BAR_MAX) * BAR_AREA_WIDTH;
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
                <text x={x} y={BAR_CHART_HEIGHT - 6} textAnchor="middle" className="fill-zinc-500 text-[10px]">
                  {tick}
                </text>
              </g>
            );
          })}

          {MOST_ACTIVE_GYMS.map((gym, index) => {
            const y = 20 + index * (BAR_HEIGHT + BAR_GAP);
            const barWidth = (gym.members / maxMembers) * BAR_AREA_WIDTH;
            const isHovered = hovered === gym.name;

            return (
              <g
                key={gym.name}
                onMouseEnter={() => setHovered(gym.name)}
                onMouseLeave={() => setHovered(null)}
                className="cursor-pointer"
              >
                <text
                  x={BAR_LABEL_WIDTH - 8}
                  y={y + BAR_HEIGHT / 2 + 4}
                  textAnchor="end"
                  className="fill-zinc-400 text-[11px]"
                >
                  {gym.name}
                </text>
                <rect
                  x={BAR_LABEL_WIDTH}
                  y={y}
                  width={barWidth}
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
            const gym = MOST_ACTIVE_GYMS.find((item) => item.name === hovered);
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
      <p className={`mt-2 text-2xl font-bold sm:text-3xl ${highlight ? "text-[#FACC15]" : "text-white"}`}>
        {value}
      </p>
      <p className="mt-1 text-xs font-medium text-emerald-400">{sub}</p>
    </article>
  );
}

export function AdminAnalyticsPanel() {
  const metrics = useAdminAnalyticsStore((state) => state.metrics);

  const statCards = [
    {
      label: "Total Users",
      value: metrics.totalUsers.toLocaleString(),
      sub: "↑ 8% vs last month",
    },
    {
      label: "Gym Owners",
      value: String(metrics.gymOwners),
      sub: "↑ 12 new",
    },
    {
      label: "Total Members",
      value: metrics.totalMembers.toLocaleString(),
      sub: "↑ 15% vs last month",
    },
    {
      label: "Active Subs",
      value: metrics.activeSubscriptions.toLocaleString(),
      sub: "80% retention",
    },
    {
      label: "Monthly Rev",
      value: `$${(metrics.monthlyRevenue / 1000).toFixed(1)}k`,
      sub: "↑ 18% vs last month",
      highlight: true,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <h2 className="text-2xl font-bold text-white">Platform Analytics</h2>

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

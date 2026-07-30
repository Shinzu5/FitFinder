"use client";

import { useAdminStore } from "@/stores/admin-store";

const CHART_WIDTH = 640;
const CHART_HEIGHT = 240;
const PADDING = { top: 16, right: 20, bottom: 32, left: 56 };

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

export function AdminRevenueChart() {
  const revenueTrend = useAdminStore((state) => state.getRevenueTrend());
  const months = revenueTrend.map((item) => item.month);
  const values = revenueTrend.map((item) => item.value);
  const max = Math.max(...values, 1);
  const yTicks = [0, max * 0.25, max * 0.5, max * 0.75, max];

  if (months.length === 0) {
    return (
      <section className="rounded-2xl border border-zinc-800/70 bg-[#0e0e10] p-5">
        <h2 className="mb-5 text-lg font-bold text-white">Revenue Snapshot</h2>
        <p className="py-16 text-center text-sm text-zinc-500">No revenue data yet.</p>
      </section>
    );
  }

  const points = values
    .map((value, index) => `${scaleX(index, months.length)},${scaleY(value, max)}`)
    .join(" ");
  const areaPoints = [
    `${scaleX(0, months.length)},${scaleY(0, max)}`,
    ...values.map((value, index) => `${scaleX(index, months.length)},${scaleY(value, max)}`),
    `${scaleX(months.length - 1, months.length)},${scaleY(0, max)}`,
  ].join(" ");

  return (
    <section className="rounded-2xl border border-zinc-800/70 bg-[#0e0e10] p-5">
      <h2 className="mb-5 text-lg font-bold text-white">Revenue Snapshot</h2>
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-label="Platform revenue snapshot from database"
      >
        <defs>
          <linearGradient id="adminRevenueFill" x1="0" y1="0" x2="0" y2="1">
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
              ₱{Math.round(tick).toLocaleString()}
            </text>
          </g>
        ))}

        <polygon points={areaPoints} fill="url(#adminRevenueFill)" />
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
            cy={scaleY(value, max)}
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

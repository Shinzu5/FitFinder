"use client";

import type { RevenueMonthPoint } from "@/stores/clerk-store";

const CHART_WIDTH = 560;
const CHART_HEIGHT = 200;
const PADDING = { top: 12, right: 16, bottom: 28, left: 40 };

interface RevenueChartProps {
  points: RevenueMonthPoint[];
}

function buildYTicks(maxValue: number): number[] {
  if (maxValue <= 0) return [0, 1, 2, 3, 4];
  const niceMax = Math.max(1, Math.ceil(maxValue / 4) * 4);
  const step = niceMax / 4;
  return [0, step, step * 2, step * 3, niceMax].map((n) =>
    Number.isInteger(step) ? n : Math.round(n * 10) / 10,
  );
}

export function RevenueChart({ points }: RevenueChartProps) {
  const months = points.length > 0 ? points.map((p) => p.month) : ["—"];
  const values = points.length > 0 ? points.map((p) => p.value) : [0];
  const maxValue = Math.max(...values, 0);
  const yTicks = buildYTicks(maxValue);
  const chartMax = yTicks[yTicks.length - 1] || 1;

  function scaleY(value: number) {
    const innerHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;
    return PADDING.top + innerHeight - (value / chartMax) * innerHeight;
  }

  function scaleX(index: number) {
    const innerWidth = CHART_WIDTH - PADDING.left - PADDING.right;
    if (months.length <= 1) return PADDING.left + innerWidth / 2;
    return PADDING.left + (index / (months.length - 1)) * innerWidth;
  }

  const linePoints = values.map((value, index) => `${scaleX(index)},${scaleY(value)}`).join(" ");
  const areaPoints = [
    `${scaleX(0)},${scaleY(0)}`,
    ...values.map((value, index) => `${scaleX(index)},${scaleY(value)}`),
    `${scaleX(months.length - 1)},${scaleY(0)}`,
  ].join(" ");

  return (
    <section className="rounded-2xl border border-white/10 bg-[#141414] p-5">
      <h2 className="mb-4 text-sm font-medium text-zinc-400">Revenue (₱k)</h2>
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-label="Monthly revenue chart from completed payments"
      >
        <defs>
          <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFD700" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#FFD700" stopOpacity="0" />
          </linearGradient>
        </defs>

        {yTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={PADDING.left}
              y1={scaleY(tick)}
              x2={CHART_WIDTH - PADDING.right}
              y2={scaleY(tick)}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="1"
            />
            <text
              x={PADDING.left - 8}
              y={scaleY(tick) + 4}
              textAnchor="end"
              className="fill-zinc-500 text-[10px]"
            >
              {tick}
            </text>
          </g>
        ))}

        <polygon points={areaPoints} fill="url(#revenueFill)" />
        <polyline
          points={linePoints}
          fill="none"
          stroke="#FFD700"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {values.map((value, index) => (
          <circle
            key={`${months[index]}-${index}`}
            cx={scaleX(index)}
            cy={scaleY(value)}
            r="4"
            fill="#FFD700"
          />
        ))}

        {months.map((month, index) => (
          <text
            key={`${month}-${index}`}
            x={scaleX(index)}
            y={CHART_HEIGHT - 8}
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

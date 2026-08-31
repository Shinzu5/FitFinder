"use client";

import { useAdminStore, type RevenuePeriod } from "@/stores/admin-store";

const CHART_WIDTH = 640;
const CHART_HEIGHT = 240;
const PADDING = { top: 16, right: 20, bottom: 32, left: 56 };

const PERIODS: { id: RevenuePeriod; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "year", label: "Year" },
];

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
  const chartPeriod = useAdminStore((state) => state.chartPeriod);
  const setChartPeriod = useAdminStore((state) => state.setChartPeriod);
  const revenueTrend = useAdminStore(
    (state) => state.revenueChart[state.chartPeriod] || [],
  );
  const labels = revenueTrend.map((item) => item.label);
  const values = revenueTrend.map((item) => item.value);
  const max = Math.max(...values, 1);
  const yTicks = [0, max * 0.25, max * 0.5, max * 0.75, max];
  const hasData = values.some((v) => v > 0);

  return (
    <section className="rounded-2xl border border-zinc-800/70 bg-[#0e0e10] p-5">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-bold text-white">Revenue</h2>
        <div className="flex flex-wrap gap-1.5">
          {PERIODS.map((period) => (
            <button
              key={period.id}
              type="button"
              onClick={() => setChartPeriod(period.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                chartPeriod === period.id
                  ? "bg-[#FACC15] text-black"
                  : "border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
              }`}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>

      {!hasData ? (
        <p className="py-16 text-center text-sm text-zinc-500">
          No successful subscription payments in this period.
        </p>
      ) : (
        <svg
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          className="h-auto w-full"
          role="img"
          aria-label="Platform revenue from successful owner subscription payments"
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

          <polygon
            points={[
              `${scaleX(0, labels.length)},${scaleY(0, max)}`,
              ...values.map(
                (value, index) => `${scaleX(index, labels.length)},${scaleY(value, max)}`,
              ),
              `${scaleX(labels.length - 1, labels.length)},${scaleY(0, max)}`,
            ].join(" ")}
            fill="url(#adminRevenueFill)"
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

          {labels.map((label, index) => {
            // Avoid crowding month labels — show every ~5th for 30-day view
            const show =
              chartPeriod !== "month" ||
              index === 0 ||
              index === labels.length - 1 ||
              index % 5 === 0;
            if (!show) return null;
            return (
              <text
                key={`${label}-${index}`}
                x={scaleX(index, labels.length)}
                y={CHART_HEIGHT - 10}
                textAnchor="middle"
                className="fill-zinc-500 text-[11px]"
              >
                {label}
              </text>
            );
          })}
        </svg>
      )}
    </section>
  );
}

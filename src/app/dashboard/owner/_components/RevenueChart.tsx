"use client";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May"];
const VALUES = [210, 285, 360, 470, 580];
const Y_TICKS = [0, 150, 300, 450, 600];

const CHART_WIDTH = 560;
const CHART_HEIGHT = 200;
const PADDING = { top: 12, right: 16, bottom: 28, left: 40 };

function scaleY(value: number) {
  const max = 600;
  const innerHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;
  return PADDING.top + innerHeight - (value / max) * innerHeight;
}

function scaleX(index: number) {
  const innerWidth = CHART_WIDTH - PADDING.left - PADDING.right;
  return PADDING.left + (index / (MONTHS.length - 1)) * innerWidth;
}

export function RevenueChart() {
  const points = VALUES.map((value, index) => `${scaleX(index)},${scaleY(value)}`).join(" ");
  const areaPoints = [
    `${scaleX(0)},${scaleY(0)}`,
    ...VALUES.map((value, index) => `${scaleX(index)},${scaleY(value)}`),
    `${scaleX(MONTHS.length - 1)},${scaleY(0)}`,
  ].join(" ");

  return (
    <section className="rounded-2xl border border-white/10 bg-[#141414] p-5">
      <h2 className="mb-4 text-sm font-medium text-zinc-400">Revenue (₱k)</h2>
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-label="Revenue chart from January to May"
      >
        <defs>
          <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFD700" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#FFD700" stopOpacity="0" />
          </linearGradient>
        </defs>

        {Y_TICKS.map((tick) => (
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
          points={points}
          fill="none"
          stroke="#FFD700"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {VALUES.map((value, index) => (
          <circle key={MONTHS[index]} cx={scaleX(index)} cy={scaleY(value)} r="4" fill="#FFD700" />
        ))}

        {MONTHS.map((month, index) => (
          <text
            key={month}
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

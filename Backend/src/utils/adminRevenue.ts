/** Bucket OwnerSubscription payments into chart series (DB-derived only). */

export interface RevenuePoint {
  label: string;
  value: number;
}

export interface RevenueChartSeries {
  today: RevenuePoint[];
  week: RevenuePoint[];
  month: RevenuePoint[];
  year: RevenuePoint[];
}

type PaymentRow = { paidAt: Date; price: number };

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function buildRevenueChartSeries(
  payments: PaymentRow[],
  now = new Date(),
): RevenueChartSeries {
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Today — single point (successful payments since local midnight)
  let todayTotal = 0;
  for (const p of payments) {
    if (p.paidAt >= startOfDay) todayTotal += p.price;
  }

  // Week — last 7 calendar days
  const week: RevenuePoint[] = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date(startOfDay);
    day.setDate(day.getDate() - i);
    const key = dayKey(day);
    let sum = 0;
    for (const p of payments) {
      if (dayKey(p.paidAt) === key) sum += p.price;
    }
    week.push({
      label: day.toLocaleDateString("en-US", { weekday: "short" }),
      value: sum,
    });
  }

  // Month — last 30 calendar days
  const month: RevenuePoint[] = [];
  for (let i = 29; i >= 0; i--) {
    const day = new Date(startOfDay);
    day.setDate(day.getDate() - i);
    const key = dayKey(day);
    let sum = 0;
    for (const p of payments) {
      if (dayKey(p.paidAt) === key) sum += p.price;
    }
    month.push({
      label: String(day.getDate()),
      value: sum,
    });
  }

  // Year — last 12 calendar months
  const year: RevenuePoint[] = [];
  for (let i = 11; i >= 0; i--) {
    const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthKey(m);
    let sum = 0;
    for (const p of payments) {
      if (monthKey(p.paidAt) === key) sum += p.price;
    }
    year.push({
      label: m.toLocaleDateString("en-US", { month: "short" }),
      value: sum,
    });
  }

  return {
    today: [{ label: "Today", value: todayTotal }],
    week,
    month,
    year,
  };
}

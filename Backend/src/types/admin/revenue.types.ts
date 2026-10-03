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

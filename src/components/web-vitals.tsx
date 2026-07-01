"use client";

import { useReportWebVitals } from "next/web-vitals";

const logWebVitals = (metric: { name: string; value: number; rating: string; delta: number; id: string; navigationType: string }) => {
  console.log(`[CWV] ${metric.name}: ${metric.value}ms (${metric.rating})`);
};

export function WebVitals() {
  useReportWebVitals(logWebVitals);
  return null;
}

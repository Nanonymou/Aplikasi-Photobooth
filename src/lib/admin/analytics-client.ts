"use client";

import type {
  AnalyticsData,
  Breakdown,
  Point,
  Trend,
} from "@/lib/admin/analytics";

/**
 * The report, from `GET /api/admin/analytics`.
 *
 * The window is the only input: presets are named day counts, so a custom range
 * needs no second code path — only a different pair of dates. Counted from this
 * app's own rows rather than a tracking service, which is why a quiet
 * installation reports zeros rather than plausible-looking traffic.
 */
export async function fetchAnalytics(range: {
  from: string;
  to: string;
}): Promise<AnalyticsData> {
  const params = new URLSearchParams({ from: range.from, to: range.to });
  const response = await fetch(`/api/admin/analytics?${params}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null);
    const data =
      typeof payload === "object" && payload !== null
        ? (payload as Record<string, unknown>)
        : {};
    throw new Error(
      typeof data.error === "string" ? data.error : "Analitik gagal dimuat.",
    );
  }

  const api = (await response.json()) as ApiReport;
  const numberFormat = new Intl.NumberFormat("id-ID");

  return {
    days: api.window.days,
    kpis: api.kpis.map((entry) => ({
      id: entry.id,
      label: entry.label,
      value: numberFormat.format(entry.total),
      // No baseline is not zero growth. The endpoint sends null for it, and a
      // dash says "nothing to compare" where "+0%" would claim a measurement.
      delta:
        entry.delta === null
          ? "—"
          : `${entry.delta >= 0 ? "+" : ""}${entry.delta.toLocaleString("id-ID")}%`,
      trend: entry.trend,
    })),
    sessions: api.series.sessions,
    newUsers: api.series.newUsers,
    downloads: api.series.exports,
    formats: api.formats,
    topTemplates: api.topTemplates,
    sources: api.sources,
  };
}

interface ApiReport {
  window: { from: string; to: string; days: number };
  series: Record<"sessions" | "designs" | "exports" | "newUsers", Point[]>;
  formats: Breakdown[];
  sources: Breakdown[];
  topTemplates: Breakdown[];
  kpis: {
    id: string;
    label: string;
    total: number;
    delta: number | null;
    trend: Trend;
  }[];
}

/** The `from`/`to` pair a preset covers, ending today. */
export function rangeForDays(days: number, now: Date = new Date()): {
  from: string;
  to: string;
} {
  const iso = (date: Date) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);

  const start = new Date(now.getTime() - (days - 1) * 86_400_000);
  return { from: iso(start), to: iso(now) };
}

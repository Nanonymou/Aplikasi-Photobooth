/**
 * Admin analytics: the vocabulary.
 *
 * Types, the preset windows, and the rule for what counts as a usable range.
 * Shared by the endpoint and the screen, so "30 hari" means one thing — and
 * deliberately free of `"use client"`, because a route handler importing a
 * client module gets a shim where the constants should be.
 *
 * The fetching lives in `analytics-client.ts`.
 */

export type Period = "7d" | "30d" | "90d";

export const PERIODS: { id: Period; label: string; days: number }[] = [
  { id: "7d", label: "7 hari", days: 7 },
  { id: "30d", label: "30 hari", days: 30 },
  { id: "90d", label: "90 hari", days: 90 },
];

export type Trend = "up" | "down" | "flat";

export interface Kpi {
  id: string;
  label: string;
  value: string;
  delta: string;
  trend: Trend;
}

export interface Point {
  /** Day offset from the start of the window, 0-based. */
  index: number;
  value: number;
}

export interface Breakdown {
  label: string;
  value: number;
  /** Formatted for display (a count or a percentage). */
  display: string;
}

export interface AnalyticsData {
  days: number;
  kpis: Kpi[];
  /** Daily photo sessions across the window — the main chart. */
  sessions: Point[];
  /** Daily new accounts — the user-growth chart. */
  newUsers: Point[];
  /** Daily exports leaving the booth — the downloads chart. */
  downloads: Point[];
  /** Which file formats those downloads were, as percentages. */
  formats: Breakdown[];
  topTemplates: Breakdown[];
  sources: Breakdown[];
}

/** Bounds a custom range is held to: enough points to plot, not so many to crawl. */
export const MIN_RANGE_DAYS = 2;
export const MAX_RANGE_DAYS = 365;

/** Whole days covered by an inclusive `from`–`to` pair, or null if unusable. */
export function daysInRange(from: string, to: string): number | null {
  const start = Date.parse(from);
  const end = Date.parse(to);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null;

  const days = Math.round((end - start) / 86_400_000) + 1;
  if (days < MIN_RANGE_DAYS || days > MAX_RANGE_DAYS) return null;
  return days;
}


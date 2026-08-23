/**
 * Admin analytics.
 *
 * Stand-in for `GET /api/admin/analytics?period=…` — headline KPIs, a daily
 * series for the chart, and two breakdowns. The numbers are generated from the
 * day index by a fixed formula rather than random, so a server render and its
 * hydration agree exactly and the shapes stay stable between reads. When the real
 * endpoint lands it returns this same shape.
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

const numberFormat = new Intl.NumberFormat("id-ID");

/** Deterministic daily series: a trend plus two gentle waves, floored at zero. */
function series(
  days: number,
  base: number,
  amp: number,
  trend: number,
): Point[] {
  return Array.from({ length: days }, (_, index) => ({
    index,
    value: Math.max(
      0,
      Math.round(
        base +
          trend * index +
          amp * Math.sin(index * 0.6) +
          amp * 0.45 * Math.sin(index * 0.23 + 1),
      ),
    ),
  }));
}

function sum(points: Point[]): number {
  return points.reduce((total, point) => total + point.value, 0);
}

/** Growth of the window's second half over its first, as a signed percentage. */
function halfOverHalf(points: Point[]): { delta: string; trend: Trend } {
  const mid = Math.floor(points.length / 2);
  const first = sum(points.slice(0, mid));
  const second = sum(points.slice(mid));
  const pct = first === 0 ? 0 : ((second - first) / first) * 100;
  const rounded = Math.round(pct * 10) / 10;
  return {
    delta: `${rounded >= 0 ? "+" : ""}${rounded.toLocaleString("id-ID")}%`,
    trend: rounded > 0 ? "up" : rounded < 0 ? "down" : "flat",
  };
}

function kpi(id: string, label: string, points: Point[]): Kpi {
  const { delta, trend } = halfOverHalf(points);
  return { id, label, value: numberFormat.format(sum(points)), delta, trend };
}

export function analyticsFor(period: Period): AnalyticsData {
  const { days } = PERIODS.find((p) => p.id === period) ?? PERIODS[1];

  const sessions = series(days, 120, 45, 2.1);
  const designs = series(days, 70, 28, 1.4);
  const exportsSeries = series(days, 40, 18, 0.9);
  const newUsers = series(days, 18, 9, 0.6);

  // Breakdowns scale with the window so they read as "this period".
  const scale = days / 30;
  const template = (name: string, base: number): Breakdown => {
    const count = Math.round(base * scale);
    return { label: name, value: count, display: numberFormat.format(count) };
  };

  const source = (label: string, pct: number): Breakdown => ({
    label,
    value: pct,
    display: `${pct}%`,
  });

  return {
    days,
    kpis: [
      kpi("sessions", "Sesi foto", sessions),
      kpi("designs", "Desain dibuat", designs),
      kpi("exports", "Ekspor", exportsSeries),
      kpi("users", "Pengguna baru", newUsers),
    ],
    sessions,
    newUsers,
    downloads: exportsSeries,
    formats: [
      source("PNG", 48),
      source("JPEG", 31),
      source("PDF", 14),
      source("WEBP", 7),
    ],
    topTemplates: [
      template("Lebaran 2026", 1240),
      template("Wisuda Klasik", 880),
      template("Pernikahan Elegan", 610),
      template("Ulang Tahun Ceria", 430),
      template("Tahun Baru Neon", 260),
    ],
    sources: [
      source("Tamu langsung", 46),
      source("Tautan bagikan", 27),
      source("QR booth", 18),
      source("Undangan", 9),
    ],
  };
}

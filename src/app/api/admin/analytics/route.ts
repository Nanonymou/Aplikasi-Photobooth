import { withPermission } from "@/lib/api/authorize";
import { jsonError } from "@/lib/api/http";
import {
  analyticsReport,
  reportToday,
  shiftDate,
  type MetricId,
  type Point,
} from "@/lib/db/analytics";
import {
  daysInRange,
  PERIODS,
  type Period,
  type Trend,
} from "@/lib/admin/analytics";

// `pg` opens TCP sockets, which the edge runtime cannot do.
export const runtime = "nodejs";

const DEFAULT_PERIOD: Period = "30d";

/** Days in the window when nothing usable was asked for. */
const DEFAULT_DAYS =
  PERIODS.find((entry) => entry.id === DEFAULT_PERIOD)?.days ?? 30;

/** Headline numbers, in the order the console's cards read. */
const KPIS: { id: MetricId; label: string }[] = [
  { id: "sessions", label: "Sesi foto" },
  { id: "designs", label: "Desain dibuat" },
  { id: "exports", label: "Ekspor" },
  { id: "newUsers", label: "Pengguna baru" },
];

interface Kpi {
  id: MetricId;
  label: string;
  total: number;
  /** Second half of the window against the first, as a signed percentage. */
  delta: number;
  trend: Trend;
}

function sum(points: Point[]): number {
  return points.reduce((total, point) => total + point.value, 0);
}

/**
 * Growth within the window, rather than against the period before it.
 *
 * Comparing to the previous period would mean a second query over twice the
 * rows for a number the card renders as one arrow. Half against half answers
 * the same question — "is this rising?" — from data already in hand.
 */
function change(points: Point[]): { delta: number; trend: Trend } {
  const mid = Math.floor(points.length / 2);
  const first = sum(points.slice(0, mid));
  const second = sum(points.slice(mid));

  // No baseline: growth from nothing is not a percentage. Anything appearing
  // where there was nothing is reported as up, and nothing as flat.
  if (first === 0) {
    return { delta: 0, trend: second > 0 ? "up" : "flat" };
  }

  const delta = Math.round(((second - first) / first) * 1000) / 10;
  return { delta, trend: delta > 0 ? "up" : delta < 0 ? "down" : "flat" };
}

/**
 * The analytics report.
 *
 *   ?period=7d|30d|90d          — a window ending today
 *   ?from=YYYY-MM-DD&to=…       — an explicit one, 2 to 365 days
 *
 * Counted from the app's own rows, not from a tracking service: sessions,
 * designs, exports, accounts, and three breakdowns over the same window. Numbers
 * are returned raw — totals, percentages, dates — because formatting them here
 * would decide for every caller how a number reads, and the console already
 * knows how it wants to say "1.240".
 *
 * An unusable range falls back to the default period rather than erroring, for
 * the same reason the other admin lists ignore unknown filters: the query string
 * is a view, and a stale bookmark should show a report.
 */
export const GET = withPermission(
  "admin.analytics.view",
  async (viewer, request: Request) => {
    const params = new URL(request.url).searchParams;

    const from = params.get("from");
    const to = params.get("to");
    const custom = from && to ? daysInRange(from, to) : null;

    const period = PERIODS.find((entry) => entry.id === params.get("period"));
    const days = custom ?? period?.days ?? DEFAULT_DAYS;

    // A custom range starts where it says; a period ends today and counts back,
    // including today — a window that stopped yesterday would report a booth's
    // busiest hours as nothing at all.
    const start = custom && from ? from : shiftDate(reportToday(), -(days - 1));

    try {
      const report = await analyticsReport(start, days);

      const kpis: Kpi[] = KPIS.map(({ id, label }) => {
        const points = report.series[id];
        return { id, label, total: sum(points), ...change(points) };
      });

      return Response.json(
        { ...report, kpis, viewer: { role: viewer.profile.role } },
        { headers: { "cache-control": "private, no-store" } },
      );
    } catch (error) {
      console.error("GET /api/admin/analytics failed", error);
      return jsonError(500, "Laporan analitik gagal dimuat.");
    }
  },
);

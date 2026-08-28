import { withPermission } from "@/lib/api/authorize";
import { jsonError } from "@/lib/api/http";
import {
  analyticsReport,
  periodTotals,
  previousWindow,
  reportToday,
  shiftDate,
  type AnalyticsReport,
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
  /**
   * Second half of the window against the first, as a signed percentage.
   * Null when the first half was empty: growth from nothing is not a ratio.
   */
  delta: number | null;
  trend: Trend;
  /** The same metric over the window before this one, when one was asked for. */
  previous?: number;
  /** This window against that one, as a signed percentage. */
  change?: number;
}

/** A percentage change, or null when there is no baseline to divide by. */
function percentage(now: number, before: number): number | null {
  if (before === 0) return null;
  return Math.round(((now - before) / before) * 1000) / 10;
}

/**
 * The report as a spreadsheet.
 *
 * One row per day with every metric on it, because that is the shape somebody
 * pastes into a sheet and pivots — a column per metric, not a file per metric.
 * The breakdowns are deliberately left out: they are a different table with
 * different columns, and stapling them under the first would produce a file no
 * spreadsheet can read as one thing.
 */
function toCsv(report: AnalyticsReport): string {
  const header = ["tanggal", "sesi", "desain", "ekspor", "pengguna_baru"];
  const rows = report.series.sessions.map((point, index) =>
    [
      point.date,
      point.value,
      report.series.designs[index].value,
      report.series.exports[index].value,
      report.series.newUsers[index].value,
    ].join(","),
  );

  return [header.join(","), ...rows].join("\n") + "\n";
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
function change(points: Point[]): { delta: number | null; trend: Trend } {
  const mid = Math.floor(points.length / 2);
  const first = sum(points.slice(0, mid));
  const second = sum(points.slice(mid));

  // No baseline: growth from nothing is not a percentage. `null` says that,
  // where the 0 this used to send was read as "no change" and printed as
  // "+0%" beside an arrow pointing up — two claims, both wrong, contradicting
  // each other on the same card.
  if (first === 0) {
    return { delta: null, trend: second > 0 ? "up" : "flat" };
  }

  const delta = Math.round(((second - first) / first) * 1000) / 10;
  return { delta, trend: delta > 0 ? "up" : delta < 0 ? "down" : "flat" };
}

/**
 * The analytics report.
 *
 *   ?period=7d|30d|90d          — a window ending today
 *   ?from=YYYY-MM-DD&to=…       — an explicit one, 2 to 365 days
 *   &compare=previous           — also count the window before this one
 *   &format=csv                 — the daily series as a spreadsheet
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

    const wantsComparison = params.get("compare") === "previous";
    const wantsCsv = params.get("format") === "csv";

    try {
      const previous = previousWindow(start, days);
      const [report, before] = await Promise.all([
        analyticsReport(start, days),
        wantsComparison
          ? periodTotals(previous.from, previous.days)
          : Promise.resolve(null),
      ]);

      if (wantsCsv) {
        return new Response(toCsv(report), {
          headers: {
            "content-type": "text/csv; charset=utf-8",
            "content-disposition": `attachment; filename="analitik-${report.window.from}-${report.window.to}.csv"`,
            "cache-control": "private, no-store",
          },
        });
      }

      const kpis: Kpi[] = KPIS.map(({ id, label }) => {
        const points = report.series[id];
        const total = sum(points);
        const kpi: Kpi = { id, label, total, ...change(points) };

        if (before) {
          kpi.previous = before[id];
          const moved = percentage(total, before[id]);
          if (moved !== null) kpi.change = moved;
        }

        return kpi;
      });

      return Response.json(
        {
          ...report,
          kpis,
          comparison: before
            ? { window: { from: previous.from, days: previous.days }, totals: before }
            : null,
          viewer: { role: viewer.profile.role },
        },
        { headers: { "cache-control": "private, no-store" } },
      );
    } catch (error) {
      console.error("GET /api/admin/analytics failed", error);
      return jsonError(500, "Laporan analitik gagal dimuat.");
    }
  },
);

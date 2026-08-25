import "server-only";

import { query } from "@/lib/db/client";

/**
 * The numbers behind the admin analytics screen.
 *
 * Everything here is counted from rows the app already writes — photo sessions,
 * designs, exports, accounts — over a window of whole days. Nothing is sampled
 * and nothing is cached: the tables are small enough to count honestly, and a
 * cached number that is quietly ten minutes old is worse than a slow one.
 *
 * Days are the unit, so the report has to agree with itself about when a day
 * starts. UTC would put a booth's Friday evening into Saturday's bar; the
 * report is therefore bucketed in a fixed local zone, and the window's edges are
 * computed in that same zone.
 */

/** Where the booths are. A day boundary has to be somebody's midnight. */
export const REPORT_TIMEZONE = process.env.ANALYTICS_TIMEZONE ?? "Asia/Jakarta";

export type MetricId = "sessions" | "designs" | "exports" | "newUsers";

export interface Point {
  /** Day offset from the start of the window, 0-based — the chart's x axis. */
  index: number;
  /** The day itself, `YYYY-MM-DD` in the report's zone. */
  date: string;
  value: number;
}

export interface Breakdown {
  label: string;
  value: number;
  /** Share of the window's total, 0–100, rounded to one decimal. */
  share: number;
}

export interface AnalyticsWindow {
  /** First day counted, `YYYY-MM-DD` in the report's zone. */
  from: string;
  /** Last day counted, inclusive. */
  to: string;
  days: number;
  timezone: string;
}

export interface AnalyticsReport {
  window: AnalyticsWindow;
  series: Record<MetricId, Point[]>;
  formats: Breakdown[];
  sources: Breakdown[];
  topTemplates: Breakdown[];
}

/** Today in the report's zone, as `YYYY-MM-DD`. */
export function reportToday(now: Date = new Date()): string {
  // `en-CA` renders as YYYY-MM-DD, which is the format Postgres takes as a date.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: REPORT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * Day arithmetic on plain `YYYY-MM-DD` strings.
 *
 * Done in UTC on purpose: these are calendar dates, not instants, and adding a
 * day to one must never land on 23:00 the same day because a zone shifted.
 */
export function shiftDate(date: string, days: number): string {
  const at = new Date(`${date}T00:00:00Z`);
  at.setUTCDate(at.getUTCDate() + days);
  return at.toISOString().slice(0, 10);
}

/** Every day in an inclusive range, in order. */
function calendar(from: string, days: number): string[] {
  return Array.from({ length: days }, (_, index) => shiftDate(from, index));
}

interface SeriesRow {
  metric: MetricId;
  day: string;
  value: number;
}

/**
 * Daily counts for all four metrics, in one round-trip.
 *
 * Each branch counts a different table over the same window, so they share the
 * bounds rather than each recomputing them — the alternative is four queries
 * whose "since" values can differ by a few milliseconds and whose totals then
 * disagree with each other for no visible reason.
 *
 * `designs` counts creations, deleted ones included: the design was made, and a
 * report that shrinks retroactively when someone empties their gallery is a
 * report nobody can reconcile.
 */
const SERIES_SQL = `
  with span as (
    select ($1::date::timestamp at time zone $3) as from_ts,
           (($2::date + 1)::timestamp at time zone $3) as to_ts
  )
  select 'sessions' as metric, (s.created_at at time zone $3)::date::text as day, count(*)::int as value
    from photo_sessions s, span
   where s.created_at >= span.from_ts and s.created_at < span.to_ts
   group by 2
  union all
  select 'designs', (d.created_at at time zone $3)::date::text, count(*)::int
    from designs d, span
   where d.created_at >= span.from_ts and d.created_at < span.to_ts
   group by 2
  union all
  select 'exports', (e.created_at at time zone $3)::date::text, count(*)::int
    from export_events e, span
   where e.created_at >= span.from_ts and e.created_at < span.to_ts
   group by 2
  union all
  select 'newUsers', (u.created_at at time zone $3)::date::text, count(*)::int
    from user_profiles u, span
   where u.created_at >= span.from_ts and u.created_at < span.to_ts
   group by 2
`;

/**
 * The three breakdowns, also in one round-trip.
 *
 * `source` is where the photos came from — the camera, an upload, or the demo
 * shots a booth shows when nobody has posed yet. Deleted photos are excluded
 * here, unlike designs above, because this answers "what is this booth used
 * for" rather than "how much happened": a shot taken and immediately retaken is
 * a retake, not a use of the upload button.
 */
const BREAKDOWN_SQL = `
  with span as (
    select ($1::date::timestamp at time zone $3) as from_ts,
           (($2::date + 1)::timestamp at time zone $3) as to_ts
  )
  select 'format' as kind, e.format as label, count(*)::int as value
    from export_events e, span
   where e.created_at >= span.from_ts and e.created_at < span.to_ts
   group by 2
  union all
  select 'source', p.source::text, count(*)::int
    from photos p, span
   where p.created_at >= span.from_ts and p.created_at < span.to_ts
     and p.deleted_at is null
   group by 2
  union all
  select 'template', coalesce(t.label, g.template_id), count(*)::int
    from design_pages g
    left join design_templates t on t.slug = g.template_id, span
   where g.created_at >= span.from_ts and g.created_at < span.to_ts
     and g.template_id is not null
   group by 2
`;

const FORMAT_LABELS: Record<string, string> = {
  png: "PNG",
  jpeg: "JPEG",
  webp: "WEBP",
  pdf: "PDF",
};

const SOURCE_LABELS: Record<string, string> = {
  camera: "Kamera",
  upload: "Unggahan",
  demo: "Contoh bawaan",
};

/** Biggest first, as shares of the group's own total. */
function toBreakdown(
  rows: { label: string; value: number }[],
  labels?: Record<string, string>,
  limit?: number,
): Breakdown[] {
  const total = rows.reduce((sum, row) => sum + row.value, 0);

  return rows
    .map((row) => ({
      label: labels?.[row.label] ?? row.label,
      value: row.value,
      share: total === 0 ? 0 : Math.round((row.value / total) * 1000) / 10,
    }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
    .slice(0, limit ?? rows.length);
}

/** How many of a kind the console lists before it stops being a top-N. */
const TOP_TEMPLATES = 5;

/**
 * The whole report for one window, given as an inclusive pair of local dates.
 *
 * Zero-filled: a day nothing happened is a zero in the chart, not a gap. The
 * database returns only days with rows, so the calendar is rebuilt here and the
 * counts are laid onto it.
 */
export async function analyticsReport(
  from: string,
  days: number,
): Promise<AnalyticsReport> {
  const to = shiftDate(from, days - 1);
  const params = [from, to, REPORT_TIMEZONE];

  const [seriesRows, breakdownRows] = await Promise.all([
    query<SeriesRow>(SERIES_SQL, params),
    query<{ kind: string; label: string; value: number }>(
      BREAKDOWN_SQL,
      params,
    ),
  ]);

  const dates = calendar(from, days);
  const byMetric = new Map<string, Map<string, number>>();
  for (const row of seriesRows) {
    const counted = byMetric.get(row.metric) ?? new Map<string, number>();
    counted.set(row.day, row.value);
    byMetric.set(row.metric, counted);
  }

  const series = (metric: MetricId): Point[] => {
    const counted = byMetric.get(metric);
    return dates.map((date, index) => ({
      index,
      date,
      value: counted?.get(date) ?? 0,
    }));
  };

  const ofKind = (kind: string) =>
    breakdownRows.filter((row) => row.kind === kind);

  return {
    window: { from, to, days, timezone: REPORT_TIMEZONE },
    series: {
      sessions: series("sessions"),
      designs: series("designs"),
      exports: series("exports"),
      newUsers: series("newUsers"),
    },
    formats: toBreakdown(ofKind("format"), FORMAT_LABELS),
    sources: toBreakdown(ofKind("source"), SOURCE_LABELS),
    topTemplates: toBreakdown(ofKind("template"), undefined, TOP_TEMPLATES),
  };
}

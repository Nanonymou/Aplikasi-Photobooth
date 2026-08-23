"use client";

import {
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { CalendarRange, TrendingDown, TrendingUp } from "lucide-react";

import { AreaChart } from "@/components/admin/area-chart";
import { BarChart } from "@/components/admin/bar-chart";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  analyticsForDays,
  daysInRange,
  MAX_RANGE_DAYS,
  MIN_RANGE_DAYS,
  PERIODS,
  type Breakdown,
  type Kpi,
  type Period,
  type Trend,
} from "@/lib/admin/analytics";
import { cn } from "@/lib/utils";

const TREND_STYLE: Record<Trend, string> = {
  up: "text-emerald-600 dark:text-emerald-400",
  down: "text-destructive",
  flat: "text-muted-foreground",
};

function KpiCard({ kpi }: { kpi: Kpi }) {
  const Icon = kpi.trend === "down" ? TrendingDown : TrendingUp;
  return (
    <div className="bg-card border-border flex flex-col gap-2 rounded-xl border p-4">
      <span className="text-muted-foreground text-sm">{kpi.label}</span>
      <div className="flex items-end justify-between gap-2">
        <span className="text-2xl font-semibold tracking-tight tabular-nums">
          {kpi.value}
        </span>
        <span
          className={cn(
            "flex items-center gap-1 text-xs font-medium",
            TREND_STYLE[kpi.trend],
          )}
        >
          {kpi.trend !== "flat" && <Icon className="size-3.5" />}
          {kpi.delta}
        </span>
      </div>
    </div>
  );
}

function BreakdownList({
  title,
  items,
}: {
  title: string;
  items: Breakdown[];
}) {
  const max = Math.max(...items.map((item) => item.value), 1);
  return (
    <section className="bg-card border-border flex flex-col rounded-xl border">
      <div className="border-border border-b px-4 py-3">
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <ul className="flex flex-col gap-3 p-4">
        {items.map((item) => (
          <li key={item.label} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="min-w-0 truncate">{item.label}</span>
              <span className="text-muted-foreground shrink-0 tabular-nums">
                {item.display}
              </span>
            </div>
            <div className="bg-muted h-1.5 overflow-hidden rounded-full">
              <div
                className="bg-primary h-full rounded-full"
                style={{ width: `${Math.max(4, (item.value / max) * 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** `YYYY-MM-DD` for a date, in local time — what `<input type="date">` speaks. */
function isoDate(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function shiftDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + days);
  return isoDate(date);
}

const dateLabel = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function formatDate(iso: string): string {
  return dateLabel.format(new Date(`${iso}T00:00:00`));
}

/**
 * Today's date, or `null` on the server.
 *
 * A date picker needs a clock, and a clock read during render would disagree
 * between the server pass and hydration. Reading it through `useSyncExternalStore`
 * keeps the first paint date-free and fills it in once mounted — the same shape
 * the guest session uses. Cached so the snapshot is a stable reference.
 */
let todayCache: string | null = null;
const subscribeToday = () => () => {};

function useToday(): string | null {
  return useSyncExternalStore(
    subscribeToday,
    () => (todayCache ??= isoDate(new Date())),
    () => null,
  );
}

/**
 * The frame every chart shares: a titled card, an optional figure on the right,
 * and the window's span labelled under the plot so a bare curve has a time axis.
 */
function ChartCard({
  title,
  note,
  span,
  children,
}: {
  title: string;
  note?: string;
  /** The window's ends, already worded — relative for presets, dates for a range. */
  span: { start: string; end: string };
  children: ReactNode;
}) {
  return (
    <section className="bg-card border-border flex flex-col rounded-xl border">
      <div className="border-border flex items-center justify-between gap-2 border-b px-4 py-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {note && (
          <span className="text-muted-foreground text-xs tabular-nums">
            {note}
          </span>
        )}
      </div>
      <div className="p-4">
        {children}
        <div className="text-muted-foreground mt-2 flex justify-between gap-2 text-xs">
          <span>{span.start}</span>
          <span>{span.end}</span>
        </div>
      </div>
    </section>
  );
}

/** A preset window, or a hand-picked pair of dates. */
type RangeMode = Period | "custom";

/**
 * The analytics view, scoped to a range.
 *
 * One control drives everything: pick a window — a preset, or a custom start and
 * end — and the KPIs, all three charts, and the breakdowns recompute from the
 * same mock source, so the interaction is real before the API. A custom range is
 * only adopted once it is usable (in order, within bounds); until then the last
 * good window stays on screen rather than blanking the report mid-edit. Sessions
 * and user growth read as trends, so they get areas; downloads are per-day
 * counts, so they get bars. Every chart is plain SVG — no chart dependency.
 */
export function AnalyticsDashboard() {
  const today = useToday();
  const [mode, setMode] = useState<RangeMode>("30d");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const presetDays =
    PERIODS.find((p) => p.id === mode)?.days ?? PERIODS[1].days;
  const customDays = mode === "custom" ? daysInRange(from, to) : null;

  // While a custom range is half-typed or out of bounds it resolves to nothing;
  // the report then holds the last window that did resolve. Remembering it during
  // render (not in an effect) keeps the charts from flashing a stale frame first.
  const [lastGoodDays, setLastGoodDays] = useState(PERIODS[1].days);
  const resolved = mode === "custom" ? customDays : presetDays;
  const days = resolved ?? lastGoodDays;
  if (resolved !== null && resolved !== lastGoodDays) setLastGoodDays(resolved);

  const rangeInvalid =
    mode === "custom" && from !== "" && to !== "" && customDays === null;

  // Preset windows end today, so they read relatively; a custom one names its ends.
  const span =
    mode === "custom" && customDays !== null
      ? { start: formatDate(from), end: formatDate(to) }
      : { start: `${days} hari lalu`, end: "Hari ini" };

  function startCustom() {
    setMode("custom");
    // Seed with the window already on screen, so the picker opens somewhere sane.
    if (today && !from && !to) {
      setFrom(shiftDays(today, -(presetDays - 1)));
      setTo(today);
    }
  }

  const data = useMemo(() => analyticsForDays(days), [days]);
  const peak = useMemo(
    () => Math.max(...data.sessions.map((point) => point.value)),
    [data],
  );
  const totalUsers = useMemo(
    () => data.newUsers.reduce((sum, point) => sum + point.value, 0),
    [data],
  );
  const totalDownloads = useMemo(
    () => data.downloads.reduce((sum, point) => sum + point.value, 0),
    [data],
  );

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-end">
        {mode === "custom" && (
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="date"
              value={from}
              max={to || today || undefined}
              onChange={(event) => setFrom(event.target.value)}
              aria-label="Tanggal mulai"
              className="h-8 w-auto text-xs"
            />
            <span className="text-muted-foreground text-xs">—</span>
            <Input
              type="date"
              value={to}
              min={from || undefined}
              max={today || undefined}
              onChange={(event) => setTo(event.target.value)}
              aria-label="Tanggal akhir"
              className="h-8 w-auto text-xs"
            />
            <span
              className={
                rangeInvalid
                  ? "text-destructive text-xs"
                  : "text-muted-foreground text-xs tabular-nums"
              }
              aria-live="polite"
            >
              {rangeInvalid
                ? `Rentang ${MIN_RANGE_DAYS}–${MAX_RANGE_DAYS} hari, akhir setelah mulai.`
                : customDays !== null
                  ? `${customDays} hari`
                  : "Pilih tanggal"}
            </span>
          </div>
        )}

        <div className="min-w-0 overflow-x-auto">
          <ToggleGroup
            type="single"
            variant="outline"
            value={mode}
            onValueChange={(value) => {
              if (!value) return;
              if (value === "custom") startCustom();
              else setMode(value as Period);
            }}
          >
            {PERIODS.map(({ id, label }) => (
              <ToggleGroupItem key={id} value={id} className="whitespace-nowrap">
                {label}
              </ToggleGroupItem>
            ))}
            <ToggleGroupItem value="custom" className="whitespace-nowrap">
              <CalendarRange className="size-3.5" />
              Kustom
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {data.kpis.map((kpi) => (
          <KpiCard key={kpi.id} kpi={kpi} />
        ))}
      </div>

      <ChartCard
        title="Sesi foto harian"
        note={`Puncak ${peak.toLocaleString("id-ID")}`}
        span={span}
      >
        <AreaChart points={data.sessions} gradientId="chart-sessions" />
      </ChartCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title="Pengguna baru"
          note={`${totalUsers.toLocaleString("id-ID")} akun`}
          span={span}
        >
          <AreaChart points={data.newUsers} gradientId="chart-users" />
        </ChartCard>

        <ChartCard
          title="Unduhan harian"
          note={`${totalDownloads.toLocaleString("id-ID")} berkas`}
          span={span}
        >
          <BarChart points={data.downloads} />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <BreakdownList title="Template terpopuler" items={data.topTemplates} />
        <BreakdownList title="Format unduhan" items={data.formats} />
        <BreakdownList title="Sumber kunjungan" items={data.sources} />
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";

import { AreaChart } from "@/components/admin/area-chart";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  analyticsFor,
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

/**
 * The analytics view, scoped to a period.
 *
 * One control drives everything: pick a window and the KPIs, the trend chart, and
 * the breakdowns all recompute from the same mock source, so the interaction is
 * real before the API. The chart is drawn in plain SVG, no chart dependency.
 */
export function AnalyticsDashboard() {
  const [period, setPeriod] = useState<Period>("30d");
  const data = useMemo(() => analyticsFor(period), [period]);
  const peak = useMemo(
    () => Math.max(...data.sessions.map((point) => point.value)),
    [data],
  );

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex justify-end">
        <div className="min-w-0 overflow-x-auto">
          <ToggleGroup
            type="single"
            variant="outline"
            value={period}
            onValueChange={(value) => value && setPeriod(value as Period)}
          >
            {PERIODS.map(({ id, label }) => (
              <ToggleGroupItem key={id} value={id} className="whitespace-nowrap">
                {label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {data.kpis.map((kpi) => (
          <KpiCard key={kpi.id} kpi={kpi} />
        ))}
      </div>

      <section className="bg-card border-border flex flex-col rounded-xl border">
        <div className="border-border flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Sesi foto harian</h2>
          <span className="text-muted-foreground text-xs tabular-nums">
            Puncak {peak.toLocaleString("id-ID")}
          </span>
        </div>
        <div className="p-4">
          <AreaChart points={data.sessions} />
          <div className="text-muted-foreground mt-2 flex justify-between text-xs">
            <span>{data.days} hari lalu</span>
            <span>Hari ini</span>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BreakdownList title="Template terpopuler" items={data.topTemplates} />
        <BreakdownList title="Sumber kunjungan" items={data.sources} />
      </div>
    </div>
  );
}

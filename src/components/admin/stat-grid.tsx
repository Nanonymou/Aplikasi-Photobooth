import {
  Camera,
  HardDrive,
  LayoutTemplate,
  TrendingDown,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";

import { ADMIN_STATS, type AdminStat, type Trend } from "@/lib/admin/overview";
import { cn } from "@/lib/utils";

const ICONS: Record<AdminStat["id"], LucideIcon> = {
  users: Users,
  designs: LayoutTemplate,
  photos: Camera,
  storage: HardDrive,
};

const TREND_STYLE: Record<Trend, string> = {
  up: "text-emerald-600 dark:text-emerald-400",
  down: "text-destructive",
  flat: "text-muted-foreground",
};

function Delta({ stat }: { stat: AdminStat }) {
  if (!stat.delta || !stat.trend) return null;
  const Icon = stat.trend === "down" ? TrendingDown : TrendingUp;

  return (
    <span
      className={cn(
        "flex items-center gap-1 text-xs font-medium",
        TREND_STYLE[stat.trend],
      )}
    >
      {stat.trend !== "flat" && <Icon className="size-3.5" />}
      {stat.delta}
    </span>
  );
}

function StatCard({ stat }: { stat: AdminStat }) {
  const Icon = ICONS[stat.id];

  return (
    <div className="bg-card border-border flex flex-col gap-3 rounded-xl border p-4">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-sm">{stat.label}</span>
        <span className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg">
          <Icon className="size-4" />
        </span>
      </div>

      <div className="flex items-end justify-between gap-2">
        <span className="text-2xl font-semibold tracking-tight tabular-nums">
          {stat.value}
        </span>
        <Delta stat={stat} />
      </div>

      {stat.note && (
        <span className="text-muted-foreground text-xs">{stat.note}</span>
      )}
    </div>
  );
}

/** The dashboard's headline metrics, four across on desktop. */
export function StatGrid() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {ADMIN_STATS.map((stat) => (
        <StatCard key={stat.id} stat={stat} />
      ))}
    </div>
  );
}

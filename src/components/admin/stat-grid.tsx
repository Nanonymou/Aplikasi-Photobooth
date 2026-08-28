import {
  Camera,
  LayoutTemplate,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";

import { type AdminStat } from "@/lib/admin/overview";

const ICONS: Record<AdminStat["id"], LucideIcon> = {
  users: Users,
  designs: LayoutTemplate,
  photos: Camera,
  guests: UserRound,
};

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

      <span className="text-2xl font-semibold tracking-tight tabular-nums">
        {stat.value}
      </span>

      {stat.note && (
        <span className="text-muted-foreground text-xs">{stat.note}</span>
      )}
    </div>
  );
}

/** The dashboard's headline metrics, four across on desktop. */
export function StatGrid({ stats }: { stats: AdminStat[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <StatCard key={stat.id} stat={stat} />
      ))}
    </div>
  );
}

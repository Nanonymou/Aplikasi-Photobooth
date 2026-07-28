import { RECENT_ACTIVITY } from "@/lib/admin/overview";
import { initials } from "@/lib/auth/initials";

/**
 * The console's activity feed.
 *
 * An admin's first question on landing is "what changed?", so the dashboard
 * answers it up front: who did what, most recent first. Each row leads with the
 * actor's initials — the same avatar fallback the account menu uses — so people
 * are scannable before the sentence is read.
 */
export function RecentActivity() {
  return (
    <section className="bg-card border-border flex flex-col rounded-xl border">
      <div className="border-border border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Aktivitas terbaru</h2>
      </div>

      <ul className="divide-border divide-y">
        {RECENT_ACTIVITY.map((item) => (
          <li key={item.id} className="flex items-start gap-3 px-4 py-3">
            <span
              className="bg-primary/10 text-primary mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-medium"
              aria-hidden="true"
            >
              {initials(item.actor)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-snug">
                <span className="font-medium">{item.actor}</span> {item.action}
              </p>
              <p className="text-muted-foreground text-xs">{item.at}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

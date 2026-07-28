import { ROLE_COUNTS } from "@/lib/admin/overview";

const numberFormat = new Intl.NumberFormat("id-ID");

/**
 * Who holds which role.
 *
 * The RBAC feature is about roles, so the dashboard surfaces their spread right
 * away: a count per role, ordered from most privileged to least, with a bar
 * scaled to the largest group so the shape of the user base — a handful of
 * admins, a long tail of guests — is legible at a glance. Managing these is a
 * later task; this is the read-only summary that links there.
 */
export function RoleSummary() {
  const max = Math.max(...ROLE_COUNTS.map((role) => role.count));

  return (
    <section className="bg-card border-border flex flex-col rounded-xl border">
      <div className="border-border border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Sebaran peran</h2>
      </div>

      <ul className="flex flex-col gap-3 p-4">
        {ROLE_COUNTS.map((role) => (
          <li key={role.id} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{role.label}</span>
              <span className="text-muted-foreground tabular-nums">
                {numberFormat.format(role.count)}
              </span>
            </div>
            <div className="bg-muted h-1.5 overflow-hidden rounded-full">
              <div
                className="bg-primary h-full rounded-full"
                style={{ width: `${Math.max(4, (role.count / max) * 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

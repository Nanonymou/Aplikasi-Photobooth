import type { RoleCount } from "@/lib/admin/overview";

const numberFormat = new Intl.NumberFormat("id-ID");

/**
 * Who holds which role.
 *
 * The RBAC feature is about roles, so the dashboard surfaces their spread right
 * away: a count per role, ordered from most privileged to least, with a bar
 * scaled to the largest group so the shape of the user base — a handful of
 * admins, a long tail of guests — is legible at a glance.
 *
 * Every role is listed, including the ones nobody holds: a breakdown that omits
 * its empty rows is one you cannot read a zero off, and "no operators yet" is
 * exactly the sort of thing an admin opens this panel to find out.
 */
export function RoleSummary({ roles }: { roles: RoleCount[] }) {
  const max = Math.max(...roles.map((role) => role.count), 1);

  return (
    <section className="bg-card border-border flex flex-col rounded-xl border">
      <div className="border-border border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Sebaran peran</h2>
      </div>

      <ul className="flex flex-col gap-3 p-4">
        {roles.map((role) => (
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
                style={{ width: `${role.count === 0 ? 0 : Math.max(4, (role.count / max) * 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

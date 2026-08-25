import "server-only";

import { query } from "@/lib/db/client";
import type { UserRole } from "@/lib/db/user-profiles";

/**
 * The access policy, read from the database.
 *
 * Every guarded thing asks the same question — may this role do this? — so it is
 * asked in one place, against `role_permissions` (migration 0014), rather than
 * re-expressed as a list of role names at each call site.
 */

export type AppPermission =
  | "admin.console"
  | "admin.users.manage"
  | "admin.content.manage"
  | "admin.analytics.view"
  | "admin.settings.manage"
  | "admin.branding.manage"
  | "booth.kiosk"
  | "booth.slideshow"
  | "design.edit"
  | "design.export"
  | "design.share";

/**
 * Everything a role may do.
 *
 * Fetched whole rather than one permission at a time: a role has a handful of
 * them, the answer is the same for every user holding that role, and a request
 * usually checks more than one. It also lets the client be told what it may do,
 * so the UI hides what it cannot reach instead of guessing.
 */
export async function permissionsForRole(
  role: UserRole,
): Promise<AppPermission[]> {
  const rows = await query<{ permission: AppPermission }>(
    "select permission from role_permissions where role = $1 order by permission",
    [role],
  );
  return rows.map((row) => row.permission);
}

/** Whether one role holds one permission. */
export async function roleHasPermission(
  role: UserRole,
  permission: AppPermission,
): Promise<boolean> {
  const rows = await query<{ ok: boolean }>(
    "select true as ok from role_permissions where role = $1 and permission = $2",
    [role, permission],
  );
  return rows.length > 0;
}

import { withPermission } from "@/lib/api/authorize";
import { jsonError } from "@/lib/api/http";
import { listUserProfiles, type UserRole } from "@/lib/db/user-profiles";

// `pg` opens TCP sockets, which the edge runtime cannot do.
export const runtime = "nodejs";

const ROLES: UserRole[] = ["admin", "editor", "operator", "tamu"];

/** Big enough to fill a screen, small enough that one request cannot dump the table. */
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

function parseLimit(value: string | null): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
}

/** 0-based, as the name says. Anything unusable starts at the beginning. */
function parseOffset(value: string | null): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
}

/**
 * The admin console's user list.
 *
 * Backs the search, role filter, and column sort the console already offers, so
 * those controls stop filtering a mock array in the browser and start asking the
 * database — which is also what makes them correct once there are more users
 * than one page can hold.
 *
 * Guarded by `admin.users.manage` rather than by the role name 'admin': a
 * support role that may read the directory without editing anything becomes a
 * row in `role_permissions`, not a change here.
 *
 * An unrecognised filter is ignored rather than rejected. A stale bookmark with
 * `?role=moderator` should show the unfiltered list, not an error — the query
 * string is a view, and there is nothing to protect by being strict about it.
 */
export const GET = withPermission("admin.users.manage", async (viewer, request: Request) => {
  const params = new URL(request.url).searchParams;

  const role = params.get("role");
  const sort = params.get("sort");
  const direction = params.get("dir");

  try {
    const page = await listUserProfiles({
      search: params.get("q") ?? undefined,
      role: ROLES.includes(role as UserRole) ? (role as UserRole) : undefined,
      sort: sort === "name" || sort === "joined" ? sort : undefined,
      direction: direction === "asc" ? "asc" : "desc",
      limit: parseLimit(params.get("limit")),
      offset: parseOffset(params.get("offset")),
    });

    return Response.json(
      { ...page, viewer: { role: viewer.profile.role } },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    console.error("GET /api/admin/users failed", error);
    return jsonError(500, "Daftar pengguna gagal dimuat.");
  }
});

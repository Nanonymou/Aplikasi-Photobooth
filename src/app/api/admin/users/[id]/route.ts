import { withPermission } from "@/lib/api/authorize";
import { jsonError, readJsonBody } from "@/lib/api/http";
import {
  changeUserRole,
  getUserProfile,
  LastAdminError,
  roleHistory,
  type UserRole,
} from "@/lib/db/user-profiles";

// `pg` opens TCP sockets, which the edge runtime cannot do.
export const runtime = "nodejs";

const ROLES: UserRole[] = ["admin", "editor", "operator", "tamu"];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Changes one person's role.
 *
 * The console's role dropdown writes here. Only the role is settable: a name or
 * an avatar is the account holder's own to change (`PATCH /api/account/profile`),
 * and an admin editing someone else's display name is a different feature with
 * different reasons to exist. Anything else in the body is refused outright
 * rather than ignored, because a client that thought it was setting a field and
 * got a 200 back has been told a lie.
 *
 * Two failures are worth telling apart from a plain 400:
 *
 * - 404, when the id names nobody. A malformed id answers the same way; that it
 *   could never match a uuid column is a detail of our storage, not of what the
 *   caller asked for.
 * - 409, when the change would remove the last administrator. That is a conflict
 *   with the state of the system rather than a bad request — the same call is
 *   legal the moment a second admin exists — and the console shows its message
 *   verbatim, so it has to say what is actually in the way.
 */
export const PATCH = withPermission(
  "admin.users.manage",
  async (viewer, request: Request, context: RouteContext<"/api/admin/users/[id]">) => {
    const { id } = await context.params;
    if (!UUID.test(id)) return jsonError(404, "Pengguna tidak ditemukan.");

    const body = await readJsonBody(request);
    if (!body.ok) return body.response;
    if (!isRecord(body.value)) return jsonError(400, "Body bukan objek.");

    const extra = Object.keys(body.value).filter((key) => key !== "role");
    if (extra.length > 0) {
      return jsonError(400, `Hanya peran yang bisa diubah di sini: ${extra.join(", ")} ditolak.`);
    }

    const role = body.value.role;
    if (!ROLES.includes(role as UserRole)) {
      return jsonError(400, `Peran harus salah satu dari: ${ROLES.join(", ")}.`);
    }

    try {
      const updated = await changeUserRole(
        id,
        role as UserRole,
        viewer.profile.id,
      );
      if (!updated) return jsonError(404, "Pengguna tidak ditemukan.");

      return Response.json(
        { user: updated, changedBy: viewer.profile.id },
        { headers: { "cache-control": "private, no-store" } },
      );
    } catch (error) {
      if (error instanceof LastAdminError) {
        return jsonError(409, error.message);
      }
      console.error(`PATCH /api/admin/users/${id} failed`, error);
      return jsonError(500, "Peran gagal diubah.");
    }
  },
);

/**
 * One account, with how its role got to where it is.
 *
 * The history is the point of the endpoint. A role on its own is a fact with no
 * provenance, and "when did this become an admin, and at whose hand" is the
 * question that follows every surprise — so the console can answer it without
 * anyone opening a database.
 */
export const GET = withPermission(
  "admin.users.manage",
  async (_viewer, _request: Request, context: RouteContext<"/api/admin/users/[id]">) => {
    const { id } = await context.params;
    if (!UUID.test(id)) return jsonError(404, "Pengguna tidak ditemukan.");

    try {
      const profile = await getUserProfile(id);
      if (!profile) return jsonError(404, "Pengguna tidak ditemukan.");

      return Response.json(
        { user: profile, history: await roleHistory(id) },
        { headers: { "cache-control": "private, no-store" } },
      );
    } catch (error) {
      console.error(`GET /api/admin/users/${id} failed`, error);
      return jsonError(500, "Data pengguna gagal dimuat.");
    }
  },
);

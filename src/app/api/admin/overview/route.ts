import { withPermission } from "@/lib/api/authorize";
import { jsonError } from "@/lib/api/http";
import { readOverview } from "@/lib/db/admin-overview";

// `pg` opens TCP sockets, which the edge runtime cannot do.
export const runtime = "nodejs";

/**
 * The console's summary: headline counts, the role breakdown, and what changed.
 *
 * Guarded by `admin.console` rather than by a role list — the permission is the
 * rule, and a route that named roles would be a second copy of it drifting from
 * `role_permissions`.
 *
 * The page itself reads `readOverview` directly, being a server component; this
 * endpoint is for anything that genuinely is somewhere else.
 */
export const GET = withPermission("admin.console", async (viewer) => {
  try {
    const overview = await readOverview();

    return Response.json(
      {
        ...overview,
        // Echoed so the console can show who it is reporting to.
        viewer: { email: viewer.profile.email, role: viewer.profile.role },
      },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    console.error("GET /api/admin/overview failed", error);
    return jsonError(500, "Ringkasan admin gagal dimuat.");
  }
});

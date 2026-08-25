import { withPermission } from "@/lib/api/authorize";
import { jsonError } from "@/lib/api/http";
import { query } from "@/lib/db/client";

// `pg` opens TCP sockets, which the edge runtime cannot do.
export const runtime = "nodejs";

interface CountsRow {
  users: string;
  designs: string;
  photos: string;
  guest_sessions: string;
}

/**
 * The admin dashboard's headline numbers.
 *
 * Guarded by `admin.console`, not by a role name: if the policy later grants an
 * auditor read access to the console, that is a row in `role_permissions`, not
 * an edit here.
 *
 * The counts come from one round trip. Four separate queries would be four
 * chances for the numbers to disagree with each other, on a page whose whole job
 * is to be a consistent snapshot.
 */
export const GET = withPermission("admin.console", async (viewer) => {
  try {
    const rows = await query<CountsRow>(`
      select
        (select count(*) from user_profiles) as users,
        (select count(*) from designs where deleted_at is null) as designs,
        (select count(*) from photos) as photos,
        (select count(*) from guest_sessions where claimed_at is null and expires_at > now()) as guest_sessions
    `);

    const counts = rows[0];
    return Response.json(
      {
        counts: {
          users: Number(counts.users),
          designs: Number(counts.designs),
          photos: Number(counts.photos),
          activeGuestSessions: Number(counts.guest_sessions),
        },
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

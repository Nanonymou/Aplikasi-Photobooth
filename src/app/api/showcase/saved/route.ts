import { jsonError } from "@/lib/api/http";
import { getOwnerId } from "@/lib/api/owner";
import { listSaved } from "@/lib/db/showcase";

// `pg` opens TCP sockets, which the edge runtime cannot do.
export const runtime = "nodejs";

/**
 * The caller's own shortlist.
 *
 * Its own address rather than a flag on the wall, because it is a different
 * list: the wall is everybody's designs filtered, this is one person's
 * selection, and the server is the only place that knows the second one. A
 * browser that has saved nothing — or has no owner cookie yet — gets an empty
 * list rather than an error, because "you have not saved anything" is a state,
 * not a failure.
 *
 * Withdrawn designs drop out. A shortlist is for coming back to something, and
 * an entry that cannot be opened is not worth the row it takes on screen.
 */
export async function GET(): Promise<Response> {
  try {
    const ownerId = await getOwnerId();
    if (!ownerId) {
      return Response.json(
        { items: [] },
        { headers: { "cache-control": "private, no-store" } },
      );
    }

    return Response.json(
      { items: await listSaved(ownerId) },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    console.error("GET /api/showcase/saved failed", error);
    return jsonError(500, "Daftar simpanan gagal dimuat.");
  }
}

import { jsonError } from "@/lib/api/http";
import { callerOwners } from "@/lib/api/scope";
import { listDesignPages } from "@/lib/db/designs";

export const runtime = "nodejs";

/**
 * A project's pages, as a list.
 *
 * The same 404 as the design itself when the caller does not own it, and for the
 * same reason: "you may not see this" and "this does not exist" are the same
 * answer to somebody guessing ids, and telling them apart is how a guess becomes
 * a confirmation.
 *
 * Deliberately not the whole document. `GET /api/designs/[id]` is what the
 * editor loads to render; this is what a strip, a page picker, or a "jump to
 * page" needs, and none of them want the megabytes of photo data that the
 * objects carry. What comes back instead is the shape of each page and a count
 * of what is on it — enough to draw a chip and to say "3 dari 4 slot terisi".
 */
export async function GET(
  _request: Request,
  context: RouteContext<"/api/designs/[id]/pages">,
): Promise<Response> {
  const { id } = await context.params;

  const owners = await callerOwners();
  if (owners.length === 0) return jsonError(404, "Desain tidak ditemukan.");

  try {
    const pages = await listDesignPages(owners, id);
    if (!pages) return jsonError(404, "Desain tidak ditemukan.");

    return Response.json(
      { pages },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    console.error(`GET /api/designs/${id}/pages failed`, error);
    return jsonError(500, "Daftar halaman gagal dimuat.");
  }
}

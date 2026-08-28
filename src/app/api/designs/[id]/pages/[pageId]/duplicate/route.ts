import { jsonError } from "@/lib/api/http";
import { callerOwners } from "@/lib/api/scope";
import { addDesignPage } from "@/lib/db/designs";

export const runtime = "nodejs";

/**
 * Copies a page, in place, right after the original.
 *
 * Its own address rather than a flag on "add a page", for the same reason
 * `POST /api/designs/[id]/duplicate` is not a flag on the save: it creates a
 * resource, the answer is the thing the strip should insert, and a verb hidden
 * in a request body is a verb nobody finds. One way to copy a page, at the
 * address that says so.
 *
 * The copy is made inside the database. A page's objects carry their photos
 * inline, so doing it through the browser would mean sending megabytes out and
 * posting the same megabytes straight back — the most expensive possible way to
 * say "again".
 */
export async function POST(
  _request: Request,
  context: RouteContext<"/api/designs/[id]/pages/[pageId]/duplicate">,
): Promise<Response> {
  const { id, pageId } = await context.params;

  const owners = await callerOwners();
  if (owners.length === 0) return jsonError(404, "Desain tidak ditemukan.");

  try {
    const added = await addDesignPage(owners, id, {
      copyOf: pageId,
      after: pageId,
    });
    if (!added) return jsonError(404, "Desain atau halaman tidak ditemukan.");

    return Response.json(added, {
      status: 201,
      headers: { "cache-control": "private, no-store" },
    });
  } catch (error) {
    console.error(
      `POST /api/designs/${id}/pages/${pageId}/duplicate failed`,
      error,
    );
    return jsonError(500, "Halaman gagal diduplikasi.");
  }
}

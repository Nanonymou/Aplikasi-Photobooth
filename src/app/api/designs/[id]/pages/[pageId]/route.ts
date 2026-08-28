import { jsonError } from "@/lib/api/http";
import { callerOwners } from "@/lib/api/scope";
import { removeDesignPage } from "@/lib/db/designs";

export const runtime = "nodejs";

/**
 * Removes a page.
 *
 * The last page is refused with a 409 rather than a 400: nothing about the
 * request is malformed, the design is simply in a state where it cannot be
 * granted. The editor hides the button in that state, so anybody reaching here
 * is a second tab or a script — and both deserve to be told which it is.
 *
 * The answer carries the page that takes its place and the design's new version.
 * The caller needs both: one to know where to land, the other so its next
 * autosave does not resurrect the page it just deleted.
 */
export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/designs/[id]/pages/[pageId]">,
): Promise<Response> {
  const { id, pageId } = await context.params;

  const owners = await callerOwners();
  if (owners.length === 0) return jsonError(404, "Desain tidak ditemukan.");

  try {
    const result = await removeDesignPage(owners, id, pageId);

    if (result === "not-found") {
      return jsonError(404, "Desain atau halaman tidak ditemukan.");
    }
    if (result === "last-page") {
      return jsonError(
        409,
        "Halaman terakhir tidak bisa dihapus — sebuah desain harus punya setidaknya satu halaman.",
      );
    }

    return Response.json(result, {
      headers: { "cache-control": "private, no-store" },
    });
  } catch (error) {
    console.error(`DELETE /api/designs/${id}/pages/${pageId} failed`, error);
    return jsonError(500, "Halaman gagal dihapus.");
  }
}

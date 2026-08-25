import { jsonError } from "@/lib/api/http";
import { callerOwners } from "@/lib/api/scope";
import { duplicateDesign } from "@/lib/db/gallery";

// `pg` opens TCP sockets, which the edge runtime cannot do.
export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Copies a design.
 *
 * Its own endpoint rather than a flag on the list: this creates a resource, and
 * the answer is the card the gallery should insert. The copy is made in the
 * database — a design is megabytes of inline photos, and shipping them out only
 * to have them posted straight back is the most expensive possible way to say
 * "again".
 *
 * The copy belongs to whoever owned the original, not to whichever identity
 * happened to press the button; a duplicate that quietly changed hands would
 * come apart the next time the two identities diverged.
 */
export async function POST(
  _request: Request,
  context: RouteContext<"/api/gallery/[id]/duplicate">,
): Promise<Response> {
  const { id } = await context.params;
  if (!UUID.test(id)) return jsonError(404, "Desain tidak ditemukan.");

  try {
    const owners = await callerOwners();
    const design = await duplicateDesign(owners, id);
    if (!design) return jsonError(404, "Desain tidak ditemukan.");

    return Response.json({ design }, { status: 201 });
  } catch (error) {
    console.error(`POST /api/gallery/${id}/duplicate failed`, error);
    return jsonError(500, "Desain gagal diduplikasi.");
  }
}

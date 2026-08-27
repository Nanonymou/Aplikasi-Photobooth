import { jsonError } from "@/lib/api/http";
import { callerOwners } from "@/lib/api/scope";
import { duplicateDesign } from "@/lib/db/designs";

// `pg` opens TCP sockets, which the edge runtime cannot do.
export const runtime = "nodejs";

/**
 * Copies a design.
 *
 * Its own address rather than a flag on the save, because it creates a resource
 * and the answer is the card the gallery should insert. The copy is made inside
 * the database: a design is megabytes of inline photos, and shipping them out
 * only to have them posted straight back is the most expensive possible way to
 * say "again".
 *
 * The copy belongs to whoever owned the original, not to whichever of the
 * caller's identities happened to press the button — a duplicate that quietly
 * changed hands would come apart the next time those identities diverged.
 */
export async function POST(
  _request: Request,
  context: RouteContext<"/api/designs/[id]/duplicate">,
): Promise<Response> {
  const { id } = await context.params;

  try {
    const owners = await callerOwners();
    const design = await duplicateDesign(owners, id);
    if (!design) return jsonError(404, "Desain tidak ditemukan.");

    return Response.json({ design }, { status: 201 });
  } catch (error) {
    console.error(`POST /api/designs/${id}/duplicate failed`, error);
    return jsonError(500, "Desain gagal diduplikasi.");
  }
}

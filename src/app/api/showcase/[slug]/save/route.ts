import { isJsonObject, jsonError, readJsonBody } from "@/lib/api/http";
import { requireOwnerId } from "@/lib/api/owner";
import { toggleReaction } from "@/lib/db/showcase";

// `pg` opens TCP sockets, which the edge runtime cannot do.
export const runtime = "nodejs";

/**
 * Turns the simpan on or off.
 *
 * PUT with `{ on }` rather than POST and DELETE, because it is one button that
 * somebody presses twice when they change their mind — and a client that had to
 * pick a verb would have to know which state it is in, which is exactly what it
 * asked the server a moment ago and may already be wrong about. Stating the
 * state you want makes a double-tap on a slow connection harmless.
 *
 * No account needed. The owner id is minted from the cookie if this browser does
 * not have one yet: this is a small gesture worth allowing before somebody signs
 * up, and it is the same identity every other guest record already travels on,
 * so it comes along when they do sign in.
 */
export async function PUT(
  request: Request,
  context: RouteContext<"/api/showcase/[slug]/save">,
): Promise<Response> {
  const { slug } = await context.params;

  const body = await readJsonBody(request);
  if (!body.ok) return body.response;
  if (!isJsonObject(body.value)) return jsonError(400, "Body bukan objek.");
  if (typeof body.value.on !== "boolean") {
    return jsonError(400, "`on` harus true atau false.");
  }

  try {
    const ownerId = await requireOwnerId();
    const result = await toggleReaction("save", slug, ownerId, body.value.on);
    if (!result) return jsonError(404, "Karya tidak ditemukan.");

    return Response.json(result, {
      headers: { "cache-control": "private, no-store" },
    });
  } catch (error) {
    console.error(`PUT /api/showcase/${slug}/save failed`, error);
    return jsonError(500, "Gagal menyimpan reaksimu.");
  }
}

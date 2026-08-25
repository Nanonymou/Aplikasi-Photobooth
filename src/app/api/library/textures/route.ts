import { jsonError } from "@/lib/api/http";
import { LIBRARY_CACHE, parseListParams } from "@/lib/api/library-params";
import { listTextures } from "@/lib/db/library";

export const runtime = "nodejs";

/**
 * Frame textures for the panel.
 *
 *   ?category=kilau   the drawing routine, or `all`
 *   ?q=kayu           matched against label and keywords
 *
 * Each texture carries its two colours as well as its routine, because that is
 * the whole of what makes one texture different from another built the same way
 * — gold linen is the linen routine in a different pair. The client draws the
 * tile; this says what to draw it from.
 */
export async function GET(request: Request): Promise<Response> {
  const params = parseListParams(request);
  if (!params.ok) return params.response;

  try {
    const listing = await listTextures(params.query);

    return Response.json(
      { textures: listing.textures, total: listing.total },
      { headers: { "cache-control": LIBRARY_CACHE } },
    );
  } catch (error) {
    console.error("GET /api/library/textures failed", error);
    return jsonError(500, "Daftar tekstur gagal dimuat.");
  }
}

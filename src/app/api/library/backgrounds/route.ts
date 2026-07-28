import { jsonError } from "@/lib/api/http";
import { LIBRARY_CACHE, parseListParams } from "@/lib/api/library-params";
import { listBackgrounds, listCategories } from "@/lib/db/library";

export const runtime = "nodejs";

/**
 * Backgrounds for the library panel, grouped by category.
 *
 *   ?category=gradasi   category slug, or `all`
 *   ?q=ungu             matched against label and keywords
 *   ?limit / ?offset    paging, capped
 *
 * Each item carries its complete `PageBackground` value, so picking one is an
 * assignment rather than another request: a solid is a colour, a gradient is
 * two and an angle, a pattern names a tile the client already knows how to
 * draw.
 */
export async function GET(request: Request): Promise<Response> {
  const params = parseListParams(request);
  if (!params.ok) return params.response;

  try {
    const [listing, categories] = await Promise.all([
      listBackgrounds(params.query),
      listCategories("background", "backgrounds"),
    ]);

    return Response.json(
      {
        backgrounds: listing.backgrounds,
        total: listing.total,
        categories,
      },
      { headers: { "cache-control": LIBRARY_CACHE } },
    );
  } catch (error) {
    console.error("GET /api/library/backgrounds failed", error);
    return jsonError(500, "Daftar latar belakang gagal dimuat.");
  }
}

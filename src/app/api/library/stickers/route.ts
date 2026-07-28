import { jsonError } from "@/lib/api/http";
import { LIBRARY_CACHE, parseListParams } from "@/lib/api/library-params";
import { listCategories, listStickers } from "@/lib/db/library";

export const runtime = "nodejs";

/**
 * Stickers for the library panel, filtered and searchable.
 *
 *   ?category=wisuda   category slug, or `all`
 *   ?q=graduation      matched against label and keywords
 *   ?limit / ?offset   paging, capped
 *
 * Keyword matching matters more here than anywhere else in the library: people
 * type "graduation" looking for a sticker labelled "Topi toga", and "cake" for
 * one labelled "Kue". The catalogue carries those synonyms; the search uses
 * them.
 */
export async function GET(request: Request): Promise<Response> {
  const params = parseListParams(request);
  if (!params.ok) return params.response;

  try {
    const [listing, categories] = await Promise.all([
      listStickers(params.query),
      listCategories("sticker", "stickers"),
    ]);

    return Response.json(
      {
        stickers: listing.stickers,
        total: listing.total,
        categories,
      },
      { headers: { "cache-control": LIBRARY_CACHE } },
    );
  } catch (error) {
    console.error("GET /api/library/stickers failed", error);
    return jsonError(500, "Daftar stiker gagal dimuat.");
  }
}

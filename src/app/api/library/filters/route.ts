import { jsonError } from "@/lib/api/http";
import { LIBRARY_CACHE, parseListParams } from "@/lib/api/library-params";
import { listFilterCategories, listFilters } from "@/lib/db/library";

export const runtime = "nodejs";

/**
 * Photo filters for the panel.
 *
 *   ?category=vintage   family slug, or `all`
 *   ?q=hitam            matched against label and keywords
 *   ?limit / ?offset    paging, capped
 *
 * The catalogue moved into the database (migration 0024) so an admin can curate
 * it like every other library — publish, unpublish, mark premium, reorder — and
 * this is the editor's side of that: only what is published, in the order it was
 * curated into.
 *
 * Each filter carries its CSS rather than a name the client has to look up. That
 * is the whole definition of a filter, and shipping it means the panel's swatch,
 * the canvas, and the exporter apply the same string instead of three lookups
 * that can disagree.
 */
export async function GET(request: Request): Promise<Response> {
  const params = parseListParams(request);
  if (!params.ok) return params.response;

  try {
    const [listing, categories] = await Promise.all([
      listFilters(params.query),
      listFilterCategories(),
    ]);

    return Response.json(
      { filters: listing.filters, total: listing.total, categories },
      { headers: { "cache-control": LIBRARY_CACHE } },
    );
  } catch (error) {
    console.error("GET /api/library/filters failed", error);
    return jsonError(500, "Daftar filter gagal dimuat.");
  }
}

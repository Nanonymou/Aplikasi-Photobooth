import { jsonError } from "@/lib/api/http";
import { LIBRARY_CACHE, parseListParams } from "@/lib/api/library-params";
import { listCategories, listTemplates } from "@/lib/db/library";

export const runtime = "nodejs";

/**
 * Templates for the library panel, filtered by theme.
 *
 *   ?category=wisuda   category slug, or `all`
 *   ?q=strip           matched against label and keywords
 *   ?limit / ?offset   paging, capped
 *
 * Categories ride along in the same response: the panel needs the tabs and the
 * grid at the same moment, and asking twice would only add a round trip.
 *
 * The items are summaries — a template's composition comes from the detail
 * endpoint, once the user actually picks one.
 */
export async function GET(request: Request): Promise<Response> {
  const params = parseListParams(request);
  if (!params.ok) return params.response;

  try {
    const [listing, categories] = await Promise.all([
      listTemplates(params.query),
      listCategories("template", "design_templates"),
    ]);

    return Response.json(
      {
        templates: listing.templates,
        total: listing.total,
        categories,
      },
      { headers: { "cache-control": LIBRARY_CACHE } },
    );
  } catch (error) {
    console.error("GET /api/library/templates failed", error);
    return jsonError(500, "Daftar template gagal dimuat.");
  }
}

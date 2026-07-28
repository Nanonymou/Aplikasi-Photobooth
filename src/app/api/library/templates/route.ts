import { jsonError } from "@/lib/api/http";
import { listCategories, listTemplates, MAX_LIMIT } from "@/lib/db/library";

export const runtime = "nodejs";

/**
 * Library content is the same for everyone, so it may be cached by the browser
 * and by anything in front of the app. Short freshness with a long stale window:
 * a newly published template should appear within the minute, and a curator's
 * edit must never make the panel wait on the database.
 */
const CACHE = "public, max-age=60, stale-while-revalidate=300";

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
  const params = new URL(request.url).searchParams;

  const limitParam = params.get("limit");
  const limit = limitParam === null ? undefined : Number(limitParam);
  if (limit !== undefined && (!Number.isInteger(limit) || limit < 1)) {
    return jsonError(400, `Parameter limit harus bilangan 1–${MAX_LIMIT}.`);
  }

  const offsetParam = params.get("offset");
  const offset = offsetParam === null ? undefined : Number(offsetParam);
  if (offset !== undefined && (!Number.isInteger(offset) || offset < 0)) {
    return jsonError(400, "Parameter offset harus bilangan >= 0.");
  }

  try {
    const [listing, categories] = await Promise.all([
      listTemplates({
        category: params.get("category") ?? undefined,
        search: params.get("q") ?? undefined,
        limit,
        offset,
      }),
      listCategories("template", "design_templates"),
    ]);

    return Response.json(
      {
        templates: listing.templates,
        total: listing.total,
        categories,
      },
      { headers: { "cache-control": CACHE } },
    );
  } catch (error) {
    console.error("GET /api/library/templates failed", error);
    return jsonError(500, "Daftar template gagal dimuat.");
  }
}

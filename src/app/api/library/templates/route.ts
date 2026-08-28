import { featureContext } from "@/lib/api/features";
import { jsonError } from "@/lib/api/http";
import { parseListParams } from "@/lib/api/library-params";
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
 *
 * Each carries `locked`, which is the server's answer to "may this caller use
 * it", not the client's. `isPremium` alone would leave every screen re-deriving
 * "premium and on the free plan" and drifting from the endpoint that actually
 * refuses. Locked templates are still listed: somebody has to see what the paid
 * plan is for.
 */
export async function GET(request: Request): Promise<Response> {
  const params = parseListParams(request);
  if (!params.ok) return params.response;

  try {
    const [listing, categories, { plan }] = await Promise.all([
      listTemplates(params.query),
      listCategories("template", "design_templates"),
      featureContext(),
    ]);

    return Response.json(
      {
        templates: listing.templates.map((template) => ({
          ...template,
          locked: template.isPremium && plan === "gratis",
        })),
        total: listing.total,
        categories,
        plan,
      },
      // Per-viewer now that the answer depends on their plan.
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    console.error("GET /api/library/templates failed", error);
    return jsonError(500, "Daftar template gagal dimuat.");
  }
}

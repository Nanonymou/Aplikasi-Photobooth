import { featureContext } from "@/lib/api/features";
import { jsonError } from "@/lib/api/http";
import { LIBRARY_CACHE } from "@/lib/api/library-params";
import { getTemplate } from "@/lib/db/library";

export const runtime = "nodejs";

/**
 * One template with its full composition.
 *
 * The list endpoint stops at summaries because a composition is several
 * kilobytes of slots, texts and stickers that nobody needs until they pick a
 * template. This is the other half: everything the editor needs to build the
 * page, in the shape it already instantiates.
 *
 * `updatedAt` doubles as the ETag. Library content changes when a curator
 * edits it and not otherwise, so a client that already has a template almost
 * never needs it sent again.
 *
 * This is also where a premium template is actually withheld, rather than merely
 * labelled. The list marks them so a free plan can see what it would get; this
 * endpoint carries the slots and lettering an editor needs to build the page, so
 * it is the only point where the paywall the pricing page sells can be more than
 * a badge. 402 rather than 403, with the plan named — the client can tell a
 * paywall from a permission wall and offer the right button.
 */
export async function GET(
  request: Request,
  context: RouteContext<"/api/library/templates/[slug]">,
): Promise<Response> {
  const { slug } = await context.params;

  try {
    const template = await getTemplate(slug);
    if (!template) return jsonError(404, "Template tidak ditemukan.");

    if (template.isPremium) {
      const { plan } = await featureContext();
      if (plan === "gratis") {
        return jsonError(402, "Template ini ada di paket berbayar.", {
          requiredPlan: "pro",
        });
      }
    }

    const etag = `W/"${template.updatedAt}"`;
    if (request.headers.get("if-none-match") === etag) {
      return new Response(null, {
        status: 304,
        headers: { etag, "cache-control": LIBRARY_CACHE },
      });
    }

    return Response.json(template, {
      // Per-viewer once a premium template can be refused: a shared cache would
      // hand a free plan the copy a paying one just fetched.
      headers: {
        etag,
        "cache-control": template.isPremium ? "private, no-store" : LIBRARY_CACHE,
      },
    });
  } catch (error) {
    console.error(`GET /api/library/templates/${slug} failed`, error);
    return jsonError(500, "Template gagal dimuat.");
  }
}

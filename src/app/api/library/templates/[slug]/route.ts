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
 */
export async function GET(
  request: Request,
  context: RouteContext<"/api/library/templates/[slug]">,
): Promise<Response> {
  const { slug } = await context.params;

  try {
    const template = await getTemplate(slug);
    if (!template) return jsonError(404, "Template tidak ditemukan.");

    const etag = `W/"${template.updatedAt}"`;
    if (request.headers.get("if-none-match") === etag) {
      return new Response(null, {
        status: 304,
        headers: { etag, "cache-control": LIBRARY_CACHE },
      });
    }

    return Response.json(template, {
      headers: { etag, "cache-control": LIBRARY_CACHE },
    });
  } catch (error) {
    console.error(`GET /api/library/templates/${slug} failed`, error);
    return jsonError(500, "Template gagal dimuat.");
  }
}

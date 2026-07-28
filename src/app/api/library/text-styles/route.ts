import { jsonError } from "@/lib/api/http";
import { LIBRARY_CACHE, parseListParams } from "@/lib/api/library-params";
import { listCategories, listTextStyles } from "@/lib/db/library";

export const runtime = "nodejs";

/**
 * Artistic text styles for the library panel.
 *
 *   ?category=lengkung   category slug, or `all`
 *   ?q=gradient          matched against label and keywords
 *   ?limit / ?offset     paging, capped
 *
 * Each item is a complete set of text settings under the names `TextObject`
 * uses, so picking a style is a spread onto a new text object — and the preview
 * in the panel is rendered from exactly the values the canvas will use, which
 * is the only way a preview can be trusted.
 */
export async function GET(request: Request): Promise<Response> {
  const params = parseListParams(request);
  if (!params.ok) return params.response;

  try {
    const [listing, categories] = await Promise.all([
      listTextStyles(params.query),
      listCategories("text_style", "text_styles"),
    ]);

    return Response.json(
      {
        textStyles: listing.textStyles,
        total: listing.total,
        categories,
      },
      { headers: { "cache-control": LIBRARY_CACHE } },
    );
  } catch (error) {
    console.error("GET /api/library/text-styles failed", error);
    return jsonError(500, "Daftar gaya teks gagal dimuat.");
  }
}

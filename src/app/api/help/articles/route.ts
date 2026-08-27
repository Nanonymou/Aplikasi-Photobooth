import { jsonError } from "@/lib/api/http";
import { listHelpCategories, searchHelpArticles } from "@/lib/db/help";

// `pg` opens TCP sockets, which the edge runtime cannot do.
export const runtime = "nodejs";

/** Long enough for a question, short enough not to be a paste of a log file. */
const MAX_QUERY = 120;

/**
 * The help centre's list and search.
 *
 * Public: these are published answers, and the person most likely to be
 * searching them is somebody who cannot get in. A sign-in wall on the page that
 * explains signing in is its own kind of joke.
 *
 * Categories come back with the articles rather than from a second request. The
 * counts on the chips and the list under them describe the same set, and two
 * round trips is how they end up describing two different ones.
 *
 * An over-long query is trimmed rather than refused. Somebody who pasted an
 * error message into a help search wants an answer, not a validation error, and
 * the first hundred characters of it is a fine search.
 */
export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const search = (params.get("q") ?? "").slice(0, MAX_QUERY);
  const category = params.get("kategori") ?? undefined;

  try {
    const [categories, articles] = await Promise.all([
      listHelpCategories(),
      searchHelpArticles({ query: search, category }),
    ]);

    return Response.json(
      { categories, articles, query: search, category: category ?? null },
      // Published help is the same for everybody, and it changes when somebody
      // edits it rather than per request — worth a short shared cache, short
      // enough that a correction is live within the minute.
      { headers: { "cache-control": "public, max-age=60" } },
    );
  } catch (error) {
    console.error("GET /api/help/articles failed", error);
    return jsonError(500, "Artikel bantuan gagal dimuat.");
  }
}

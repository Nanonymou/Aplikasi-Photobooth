import { jsonError } from "@/lib/api/http";
import { MAX_LIMIT, type LibraryQuery } from "@/lib/db/library";

/**
 * Parses the query string every library list accepts.
 *
 * Shared so the four panels behave identically: the same parameter names, the
 * same caps, the same wording when a caller gets one wrong.
 */
export type ParsedListParams =
  | { ok: true; query: LibraryQuery }
  | { ok: false; response: Response };

export function parseListParams(request: Request): ParsedListParams {
  const params = new URL(request.url).searchParams;

  const limitParam = params.get("limit");
  const limit = limitParam === null ? undefined : Number(limitParam);
  if (limit !== undefined && (!Number.isInteger(limit) || limit < 1)) {
    return {
      ok: false,
      response: jsonError(400, `Parameter limit harus bilangan 1–${MAX_LIMIT}.`),
    };
  }

  const offsetParam = params.get("offset");
  const offset = offsetParam === null ? undefined : Number(offsetParam);
  if (offset !== undefined && (!Number.isInteger(offset) || offset < 0)) {
    return {
      ok: false,
      response: jsonError(400, "Parameter offset harus bilangan >= 0."),
    };
  }

  return {
    ok: true,
    query: {
      category: params.get("category") ?? undefined,
      search: params.get("q") ?? undefined,
      limit,
      offset,
    },
  };
}

/**
 * Library content is the same for everyone, so it may be cached by the browser
 * and by anything in front of the app. Short freshness with a long stale
 * window: a newly published item should appear within the minute, and a
 * curator's edit must never make the panel wait on the database.
 */
export const LIBRARY_CACHE = "public, max-age=60, stale-while-revalidate=300";

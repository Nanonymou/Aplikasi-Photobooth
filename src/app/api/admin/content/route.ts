import { withPermission } from "@/lib/api/authorize";
import { jsonError } from "@/lib/api/http";
import {
  countContent,
  isContentType,
  listContent,
  type ContentStatus,
} from "@/lib/db/admin-content";

// `pg` opens TCP sockets, which the edge runtime cannot do.
export const runtime = "nodejs";

/** A grid of cards, not a table of rows: a screenful is larger here. */
const DEFAULT_LIMIT = 48;
const MAX_LIMIT = 200;

function parseLimit(value: string | null): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
}

/** 0-based, as the name says. Anything unusable starts at the beginning. */
function parseOffset(value: string | null): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
}

/**
 * The content library an admin curates.
 *
 * Everything the four decoration tables hold, drafts included — the stockroom
 * behind `/api/library/*`, which only ever shows what is published. One endpoint
 * across all four kinds because the console shows them in one grid, and asking
 * it to fan out to four URLs would make "semua" the slowest tab.
 *
 * `counts` covers the whole library rather than the current filter: the summary
 * strip has to keep saying how much exists while the grid shows a search.
 *
 * Unrecognised `type` or `status` values are ignored rather than rejected. A
 * stale bookmark should show the unfiltered library, not an error — the query
 * string is a view, and there is nothing to protect by being strict about it.
 */
export const GET = withPermission(
  "admin.content.manage",
  async (viewer, request: Request) => {
    const params = new URL(request.url).searchParams;

    const type = params.get("type");
    const status = params.get("status");

    try {
      const [page, counts] = await Promise.all([
        listContent({
          search: params.get("q") ?? undefined,
          type: isContentType(type) ? type : undefined,
          status:
            status === "published" || status === "draft"
              ? (status as ContentStatus)
              : undefined,
          limit: parseLimit(params.get("limit")),
          offset: parseOffset(params.get("offset")),
        }),
        countContent(),
      ]);

      return Response.json(
        { ...page, counts, viewer: { role: viewer.profile.role } },
        { headers: { "cache-control": "private, no-store" } },
      );
    } catch (error) {
      console.error("GET /api/admin/content failed", error);
      return jsonError(500, "Pustaka konten gagal dimuat.");
    }
  },
);

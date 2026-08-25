import { getAccountId } from "@/lib/api/account";
import { jsonError } from "@/lib/api/http";
import { getOwnerId } from "@/lib/api/owner";
import {
  listGallery,
  ownerScope,
  type GalleryScope,
  type GallerySort,
} from "@/lib/db/gallery";

// `pg` opens TCP sockets, which the edge runtime cannot do.
export const runtime = "nodejs";

/** A wall of cards; a screenful is bigger than a table's page. */
const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 100;

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
 * Everything the caller has made.
 *
 *   ?q=…              — matched against the title
 *   ?scope=shared     — only designs with a live link
 *   ?sort=name|recent — alphabetical, or newest change first
 *
 * Guarded by identity rather than by permission: a gallery is not a privileged
 * area, it is the ordinary user's own shelf, and every role has one. A guest
 * with nothing but a cookie has one too — theirs is simply scoped to that
 * cookie, which is the whole of who they are here.
 *
 * `sharedCount` is over the whole shelf, not the current filter, so the "shared"
 * tab can say how many it would show before anyone clicks it.
 */
export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;

  const scope = params.get("scope");
  const sort = params.get("sort");

  try {
    const [accountId, ownerId] = await Promise.all([
      getAccountId(),
      getOwnerId(),
    ]);
    const owners = await ownerScope(accountId, ownerId);

    const page = await listGallery({
      owners,
      search: params.get("q") ?? undefined,
      scope: scope === "shared" ? (scope as GalleryScope) : "all",
      sort: sort === "name" ? (sort as GallerySort) : "recent",
      limit: parseLimit(params.get("limit")),
      offset: parseOffset(params.get("offset")),
    });

    return Response.json(page, {
      headers: { "cache-control": "private, no-store" },
    });
  } catch (error) {
    console.error("GET /api/gallery failed", error);
    return jsonError(500, "Galeri gagal dimuat.");
  }
}

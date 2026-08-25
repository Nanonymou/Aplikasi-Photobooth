import { withPermission } from "@/lib/api/authorize";
import { jsonError } from "@/lib/api/http";
import { listSlides, slideLimit } from "@/lib/db/slideshow";

// `pg` opens TCP sockets, which the edge runtime cannot do.
export const runtime = "nodejs";

/**
 * The live slideshow's feed.
 *
 *   ?limit=30           — newest shares first
 *   ?since=<ISO time>   — only what arrived after that, for polling
 *
 * Each slide carries the code its picture is served under, not a storage URL:
 * the file still comes through an endpoint that can refuse it, so a guest who
 * revokes their share stops appearing on the wall rather than merely stopping
 * being listed.
 *
 * `serverTime` is the value to pass back as `since` on the next poll. Taken
 * here rather than read off the client's clock, because a projector's clock is
 * nobody's idea of a source of truth and a minute of drift is a slide that
 * either repeats forever or is never shown.
 */
export const GET = withPermission("booth.slideshow", async (_viewer, request: Request) => {
  const params = new URL(request.url).searchParams;
  const since = params.get("since");

  // An unparseable `since` is ignored rather than rejected: the worst case is a
  // slideshow that redraws its whole loop once, which nobody in the room notices.
  const usable = since && !Number.isNaN(Date.parse(since)) ? since : undefined;

  try {
    const slides = await listSlides(slideLimit(params.get("limit")), usable);

    return Response.json(
      { slides, serverTime: new Date().toISOString() },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    console.error("GET /api/slideshow/feed failed", error);
    return jsonError(500, "Feed slideshow gagal dimuat.");
  }
});

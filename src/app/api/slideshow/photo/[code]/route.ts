import { withPermission } from "@/lib/api/authorize";
import { findShare } from "@/lib/db/shares";
import { getShareStorage } from "@/lib/storage/share-storage";

// Reading from storage needs Node APIs.
export const runtime = "nodejs";

function plain(status: number, message: string): Response {
  return new Response(message, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

/**
 * One slide's picture.
 *
 * The same bytes `/s/[code]` serves, deliberately through a different door. That
 * route is the guest's link and counts every read as a download; a slideshow
 * that loops for four hours would otherwise report a quiet event as the most
 * downloaded photostrip anyone ever made. Here nothing is counted — the screen
 * is showing the picture, not taking it.
 *
 * The share's own rules still decide: expired and revoked shares are refused,
 * so pulling a link takes it off the projector on the next redraw.
 */
export const GET = withPermission(
  "booth.slideshow",
  async (_viewer, _request: Request, context: RouteContext<"/api/slideshow/photo/[code]">) => {
    const { code } = await context.params;

    const lookup = await findShare(code);
    if (lookup.status !== "ok") {
      return plain(404, "Slide tidak tersedia lagi.");
    }

    const data = await getShareStorage().read(lookup.share.storageKey);
    if (!data) return plain(404, "Berkas tidak ditemukan lagi.");

    return new Response(data as BodyInit, {
      headers: {
        "content-type": lookup.share.contentType,
        "content-length": String(data.byteLength),
        // A slide's bytes never change under its code, so the browser may keep
        // it for the length of a loop; private, because the projector's session
        // is what makes it readable at all.
        "cache-control": "private, max-age=300",
      },
    });
  },
);

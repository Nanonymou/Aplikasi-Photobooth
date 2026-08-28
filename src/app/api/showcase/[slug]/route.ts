import { getAccountId } from "@/lib/api/account";
import { jsonError } from "@/lib/api/http";
import { getOwnerId } from "@/lib/api/owner";
import { getShowcaseItem, withdrawDesign } from "@/lib/db/showcase";

// `pg` opens TCP sockets, which the edge runtime cannot do.
export const runtime = "nodejs";

/**
 * One published design.
 *
 * A withdrawn one answers 410 rather than 404, and says so in the body. Everybody
 * holding a link that used to work deserves "the maker took this down" instead of
 * "this never existed" — the difference between an explanation and a shrug, the
 * same distinction the share links already make.
 */
export async function GET(
  _request: Request,
  context: RouteContext<"/api/showcase/[slug]">,
): Promise<Response> {
  const { slug } = await context.params;

  try {
    const item = await getShowcaseItem(slug, await getOwnerId());
    if (!item) return jsonError(404, "Karya tidak ditemukan.");

    if (item.withdrawn) {
      return jsonError(410, "Karya ini sudah diturunkan oleh pembuatnya.");
    }

    return Response.json(
      { item },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    console.error(`GET /api/showcase/${slug} failed`, error);
    return jsonError(500, "Karya gagal dimuat.");
  }
}

/**
 * Takes it off the wall.
 *
 * Only the person who published it, and only a timestamp — the row stays, the
 * link keeps explaining itself, the likes are still there if it goes back up, and
 * every remix that credits it keeps its credit.
 */
export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/showcase/[slug]">,
): Promise<Response> {
  const { slug } = await context.params;

  const accountId = await getAccountId();
  if (!accountId) return jsonError(401, "Masuk dulu untuk menurunkan karya.");

  try {
    const withdrawn = await withdrawDesign(accountId, slug);
    // The same answer whether it is somebody else's or already down: neither is
    // worth telling apart to a caller trying slugs.
    if (!withdrawn) return jsonError(404, "Karya tidak ditemukan.");

    return Response.json({ withdrawn: true });
  } catch (error) {
    console.error(`DELETE /api/showcase/${slug} failed`, error);
    return jsonError(500, "Karya gagal diturunkan.");
  }
}

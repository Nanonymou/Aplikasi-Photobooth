import { getAccountId } from "@/lib/api/account";
import { jsonError } from "@/lib/api/http";
import { callerOwners } from "@/lib/api/scope";
import { getTemplateLicense } from "@/lib/db/marketplace";

// `pg` opens TCP sockets, which the edge runtime cannot do.
export const runtime = "nodejs";

/**
 * What the caller may do with this template.
 *
 * The editor asks before offering "remix", and the card asks before deciding
 * whether to show a price or a button. Answered for free templates too — "it is
 * free" is the answer to the same question, and a second endpoint for it would
 * mean every card making two calls to find out one thing.
 *
 * Open to signed-out callers, who own things too: a licence follows the owner id
 * their browser carries, so the answer is per-visitor and never cached.
 */
export async function GET(
  _request: Request,
  context: RouteContext<"/api/showcase/[slug]/lisensi">,
): Promise<Response> {
  const { slug } = await context.params;

  try {
    const [owners, accountId] = await Promise.all([
      callerOwners(),
      getAccountId(),
    ]);

    const license = await getTemplateLicense(slug, owners, accountId);
    if (!license) return jsonError(404, "Karya tidak ditemukan.");

    return Response.json(
      { license },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    console.error(`GET /api/showcase/${slug}/lisensi failed`, error);
    return jsonError(500, "Lisensi gagal dibaca.");
  }
}

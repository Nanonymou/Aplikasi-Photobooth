import { getAccountId } from "@/lib/api/account";
import { jsonError } from "@/lib/api/http";
import { listCreatorTemplates } from "@/lib/db/marketplace";

// `pg` opens TCP sockets, which the edge runtime cannot do.
export const runtime = "nodejs";

/**
 * What the caller is selling, and what they are giving away.
 *
 * The management view of their own publications, so it includes the withdrawn
 * ones — deciding on a price is usually what happens just before something goes
 * back up.
 *
 * Signing in is required, and that is not an extra rule for the marketplace:
 * publications are filed under an account, so there is nothing here to show
 * somebody who has not got one.
 */
export async function GET(): Promise<Response> {
  const accountId = await getAccountId();
  if (!accountId) return jsonError(401, "Masuk dulu untuk mengelola template.");

  try {
    const templates = await listCreatorTemplates(accountId);
    return Response.json(
      { templates },
      // Somebody's own sales figures, and nobody else's business to cache.
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    console.error("GET /api/creator/templates failed", error);
    return jsonError(500, "Daftar template gagal dimuat.");
  }
}

import { getAccountId } from "@/lib/api/account";
import { jsonError } from "@/lib/api/http";
import { getCreatorSales } from "@/lib/db/marketplace";
import { PLATFORM_CUT } from "@/lib/marketplace/cut";

// `pg` opens TCP sockets, which the edge runtime cannot do.
export const runtime = "nodejs";

const MAX_RECENT = 100;

/**
 * What the caller has earned, and what is still owed to them.
 *
 * One response for the whole dashboard rather than one per panel: the screen
 * shows the totals above the rows they are totals of, and separate endpoints
 * would give it five chances to render a summary that disagrees with the table
 * underneath it.
 *
 * Amounts are whole rupiah, dates are ISO, and months are `YYYY-MM`. No formatted
 * strings and no month names — "Agu" is a rendering decision, and an API that
 * makes it has quietly picked a language for every screen that reads it.
 *
 * The platform's cut comes back too. The dashboard states it beside the takings,
 * and reading it from the same place the split is computed is what stops the
 * page from promising a rate the ledger does not use.
 */
export async function GET(request: Request): Promise<Response> {
  const accountId = await getAccountId();
  if (!accountId) return jsonError(401, "Masuk dulu untuk melihat penjualan.");

  const asked = Number(new URL(request.url).searchParams.get("limit") ?? 20);
  const limit = Number.isInteger(asked)
    ? Math.min(Math.max(asked, 1), MAX_RECENT)
    : 20;

  try {
    const sales = await getCreatorSales(accountId, limit);

    return Response.json(
      { ...sales, platformCut: PLATFORM_CUT },
      // Somebody's own takings. Never a shared cache.
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    console.error("GET /api/creator/sales failed", error);
    return jsonError(500, "Riwayat penjualan gagal dimuat.");
  }
}

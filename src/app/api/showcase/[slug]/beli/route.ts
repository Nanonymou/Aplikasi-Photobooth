import { getViewer } from "@/lib/api/authorize";
import { jsonError } from "@/lib/api/http";
import { siteUrl } from "@/lib/api/mailer";
import { callerOwners } from "@/lib/api/scope";
import { getPaymentGateway } from "@/lib/billing/gateway";
import { startTemplatePurchase } from "@/lib/db/marketplace";

// `pg` opens TCP sockets, which the edge runtime cannot do.
export const runtime = "nodejs";

/**
 * Starts a purchase of a paid template.
 *
 * Signing in is required, and this is the one guest-friendly corner of the app
 * where that is worth the friction. Everything else here is filed under a cookie
 * because losing it costs somebody a draft; a licence lost with a cleared cookie
 * costs them something they paid for, and there would be no address to send it
 * back to. The receipt also has to go somewhere, and a guest has no inbox.
 *
 * The row is written before the gateway is called, so a charge that starts and
 * then fails to answer still has a record on our side. The reverse order loses
 * the payments that matter most — the ones that went wrong.
 *
 * Nothing here grants the licence. The response is a place to go and pay; the
 * template becomes theirs when the gateway says the money arrived.
 */
export async function POST(
  _request: Request,
  context: RouteContext<"/api/showcase/[slug]/beli">,
): Promise<Response> {
  const { slug } = await context.params;

  const viewer = await getViewer();
  if (!viewer) return jsonError(401, "Masuk dulu untuk membeli template.");

  const gateway = getPaymentGateway();

  try {
    const started = await startTemplatePurchase({
      slug,
      // Filed under the account, the identity that outlives a browser. The
      // licence is read back against every identity the caller holds, so one
      // bought before signing in still answers for them afterwards.
      buyerOwnerId: viewer.profile.id,
      owners: await callerOwners(),
      accountId: viewer.profile.id,
      provider: gateway.name,
    });

    if (!started.ok) {
      switch (started.reason) {
        case "not-found":
          return jsonError(404, "Karya tidak ditemukan.");
        case "withdrawn":
          return jsonError(410, "Template ini sudah diturunkan pembuatnya.");
        case "free":
          return jsonError(409, "Template ini gratis — langsung remix saja.");
        case "own-template":
          return jsonError(409, "Ini template kamu sendiri.");
        case "already-owned":
          return jsonError(409, "Template ini sudah kamu beli.");
      }
    }

    const charge = await gateway.charge({
      reference: started.purchase.id,
      item: { id: slug, name: `Template: ${started.title}` },
      amountIdr: started.purchase.amountIdr,
      email: viewer.profile.email,
      // The wall, not the template's own page: that page still reads the
      // frontend's stand-in data and does not answer to a real slug yet.
      returnUrl: `${siteUrl()}/jelajah`,
    });

    if (!charge.ok) {
      return jsonError(503, charge.reason, { purchaseId: started.purchase.id });
    }

    return Response.json(
      {
        purchaseId: started.purchase.id,
        amountIdr: started.purchase.amountIdr,
        redirectUrl: charge.charge.redirectUrl,
      },
      { status: 201, headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    console.error(`POST /api/showcase/${slug}/beli failed`, error);
    return jsonError(500, "Pembelian gagal dimulai.");
  }
}

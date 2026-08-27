import { jsonError } from "@/lib/api/http";
import { getPaymentGateway } from "@/lib/billing/gateway";
import { settlePayment } from "@/lib/db/payments";

// `pg` opens TCP sockets, which the edge runtime cannot do.
export const runtime = "nodejs";

/**
 * The gateway telling us a payment moved.
 *
 * This is the only place in the app that promotes an account to a paid plan, and
 * the only one that is reachable without a session — so its entire defence is
 * the signature check inside the driver's `verify`. Anything that does not
 * verify is not a payment, and is answered 401 without a hint about why.
 *
 * The reply is deliberately terse and almost always 200. Gateways retry on
 * anything else, and retrying will not fix a notice about a payment we have no
 * row for or one whose amount does not match — those are recorded for a human
 * and acknowledged, because a webhook queue backing up behind an unfixable
 * message delays every real payment behind it.
 */
export async function POST(request: Request): Promise<Response> {
  const gateway = getPaymentGateway();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Body bukan JSON.");
  }

  const notice = gateway.verify(body, request.headers);
  if (!notice) {
    console.warn("[billing] rejected an unverified payment notice");
    return jsonError(401, "Notifikasi tidak sah.");
  }

  try {
    const result = await settlePayment({
      reference: notice.reference,
      providerRef: notice.providerRef,
      provider: gateway.name,
      status: notice.status,
      amountIdr: notice.amountIdr,
    });

    switch (result.outcome) {
      case "promoted":
        console.info(
          `[billing] payment ${result.payment.id} settled — ${result.payment.accountId} is on ${result.payment.plan}`,
        );
        return Response.json({ received: true, promoted: true });

      case "recorded":
        return Response.json({ received: true, status: result.payment.status });

      case "already-settled":
        // A retry of a notice we have already acted on. Acknowledged rather
        // than refused: the gateway is doing exactly what it should.
        return Response.json({ received: true, duplicate: true });

      case "unknown-reference":
        console.error(
          `[billing] verified notice for an unknown payment: ${notice.reference}`,
        );
        return Response.json({ received: true, matched: false });

      case "amount-mismatch":
        console.error(
          `[billing] amount mismatch on ${notice.reference}: expected ${result.expected}, got ${result.received}`,
        );
        return Response.json({ received: true, matched: false });
    }
  } catch (error) {
    // The one case worth a retry: our own failure. A 500 asks the gateway to
    // send it again, which is what we want when the database was unreachable.
    console.error("POST /api/billing/webhook failed", error);
    return jsonError(500, "Notifikasi gagal diproses.");
  }
}

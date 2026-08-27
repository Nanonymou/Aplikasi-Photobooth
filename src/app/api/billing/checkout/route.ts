import { getViewer } from "@/lib/api/authorize";
import { jsonError, readJsonBody } from "@/lib/api/http";
import { siteUrl } from "@/lib/api/mailer";
import { getPaymentGateway } from "@/lib/billing/gateway";
import { PLANS, type BillingCycle, type PlanId } from "@/lib/billing/plans";
import { planPrice } from "@/lib/db/plan-prices";
import { createPayment, monthsIn } from "@/lib/db/payments";

// `pg` opens TCP sockets, which the edge runtime cannot do.
export const runtime = "nodejs";

const PAID_PLANS = PLANS.map((plan) => plan.id).filter(
  (plan): plan is Exclude<PlanId, "gratis"> => plan !== "gratis",
);
const CYCLES: BillingCycle[] = ["monthly", "yearly"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Starts a payment for a paid plan.
 *
 * The price is read here, from `plan_prices`, and never taken from the request.
 * A body that carried an amount would be a checkout where the customer names
 * their own price, and it would look exactly like a working checkout until
 * somebody read the takings.
 *
 * A payment row is written *before* the gateway is called, so a charge that
 * starts and then fails to answer still has a record on our side. The reverse
 * order loses the payments that matter most — the ones that went wrong.
 *
 * Nothing here promotes the account. The response is a place to go and pay; the
 * plan moves when the gateway says the money arrived, and only in the webhook.
 */
export async function POST(request: Request): Promise<Response> {
  const viewer = await getViewer();
  if (!viewer) return jsonError(401, "Masuk dulu untuk berlangganan.");

  const body = await readJsonBody(request);
  if (!body.ok) return body.response;
  if (!isRecord(body.value)) return jsonError(400, "Body bukan objek.");

  const extra = Object.keys(body.value).filter(
    (key) => key !== "plan" && key !== "cycle",
  );
  if (extra.length > 0) {
    return jsonError(400, `Bidang tidak dikenal: ${extra.join(", ")}.`);
  }

  const plan = body.value.plan;
  if (!PAID_PLANS.includes(plan as Exclude<PlanId, "gratis">)) {
    return jsonError(400, `Paket harus salah satu dari: ${PAID_PLANS.join(", ")}.`);
  }

  const cycle = body.value.cycle;
  if (!CYCLES.includes(cycle as BillingCycle)) {
    return jsonError(400, `Siklus harus salah satu dari: ${CYCLES.join(", ")}.`);
  }

  const gateway = getPaymentGateway();

  try {
    const monthly = await planPrice(
      plan as PlanId,
      cycle as BillingCycle,
    );
    if (monthly === null || monthly <= 0) {
      return jsonError(409, "Paket ini belum punya harga.");
    }

    // The invoice is the whole cycle. A yearly plan quotes a monthly rate and
    // charges twelve of them, and the number on the receipt has to be the one
    // that leaves the customer's account.
    const amountIdr = monthly * monthsIn(cycle as BillingCycle);

    // Our row first, so its id is the reference the gateway echoes back.
    const payment = await createPayment({
      accountId: viewer.profile.id,
      plan: plan as Exclude<PlanId, "gratis">,
      cycle: cycle as BillingCycle,
      amountIdr,
      provider: gateway.name,
      // Replaced by the provider's own id once it answers; until then our
      // reference stands in, because the column cannot be empty and a payment
      // with no reference at all is a payment nobody can match.
      providerRef: "pending",
    });

    const charge = await gateway.charge({
      reference: payment.id,
      plan: plan as Exclude<PlanId, "gratis">,
      cycle: cycle as BillingCycle,
      amountIdr,
      email: viewer.profile.email,
      returnUrl: `${siteUrl()}/langganan`,
    });

    if (!charge.ok) {
      return jsonError(503, charge.reason, { paymentId: payment.id });
    }

    return Response.json(
      {
        paymentId: payment.id,
        amountIdr,
        redirectUrl: charge.charge.redirectUrl,
      },
      { status: 201, headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    console.error("POST /api/billing/checkout failed", error);
    return jsonError(500, "Pembayaran gagal dimulai.");
  }
}

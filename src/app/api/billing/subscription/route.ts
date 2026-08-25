import { getAccountId } from "@/lib/api/account";
import { jsonError, readJsonBody } from "@/lib/api/http";
import { callerOwners } from "@/lib/api/scope";
import {
  cancelSubscription,
  FREE_PLAN,
  getSubscription,
  planUsage,
  requestUpgrade,
} from "@/lib/db/subscriptions";
import {
  PLANS,
  planById,
  type BillingCycle,
  type PlanId,
} from "@/lib/billing/plans";

// `pg` opens TCP sockets, which the edge runtime cannot do.
export const runtime = "nodejs";

const PLAN_IDS = PLANS.map((plan) => plan.id);
const CYCLES: BillingCycle[] = ["monthly", "yearly"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * The account's plan, and how much of it is used.
 *
 * Usage is counted across every identity the caller holds, like the gallery, so
 * the bar on the status card means the same thing on every device. A guest with
 * no account is answered too — the free tier, with their own usage — because
 * "you have used 3 of 5" is exactly what a booth guest is entitled to know
 * before being asked to sign up for more.
 *
 * The limits come back with it rather than being left for the client to look
 * up: the number the bar fills from and the sentence in the feature list are the
 * same promise, and the endpoint is where they are kept from drifting.
 */
export async function GET(): Promise<Response> {
  try {
    const [accountId, owners] = await Promise.all([
      getAccountId(),
      callerOwners(),
    ]);

    const subscription = accountId
      ? await getSubscription(accountId)
      : FREE_PLAN;
    const usage = await planUsage(owners);

    return Response.json(
      {
        subscription,
        usage,
        limits: planById(subscription.plan).limits,
        signedIn: accountId !== null,
      },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    console.error("GET /api/billing/subscription failed", error);
    return jsonError(500, "Data langganan gagal dimuat.");
  }
}

/**
 * Chooses a plan.
 *
 * A paid plan is recorded as a *request*, not granted: the response is 202 and
 * the account stays exactly where it was until a payment is confirmed. There is
 * no payment provider wired up yet, so nothing here can confirm one — and an
 * endpoint that flipped the plan on request would be a checkout that charges
 * nobody, which is the kind of shortcut that stays invisible until the month the
 * invoices do not add up.
 *
 * Moving to the free tier is the one change that needs no payment, and it is a
 * cancellation rather than a switch: the month already paid for is served out
 * first. That is `DELETE`, and asking for `gratis` here is redirected to it
 * rather than quietly doing something different from what the verb says.
 */
export async function POST(request: Request): Promise<Response> {
  const accountId = await getAccountId();
  if (!accountId) {
    return jsonError(401, "Masuk dulu untuk memilih paket.");
  }

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
  if (!PLAN_IDS.includes(plan as PlanId)) {
    return jsonError(400, `Paket harus salah satu dari: ${PLAN_IDS.join(", ")}.`);
  }
  if (plan === "gratis") {
    return jsonError(
      400,
      "Turun ke paket gratis adalah pembatalan: pakai DELETE agar sisa periode yang sudah dibayar tetap terpakai.",
    );
  }

  const cycle = body.value.cycle;
  if (!CYCLES.includes(cycle as BillingCycle)) {
    return jsonError(400, `Siklus harus salah satu dari: ${CYCLES.join(", ")}.`);
  }

  try {
    const subscription = await requestUpgrade(
      accountId,
      plan as Exclude<PlanId, "gratis">,
      cycle as BillingCycle,
    );

    return Response.json(
      {
        subscription,
        // Said plainly, because the screen has to tell the person something
        // truthful about what just happened to their money: nothing.
        message:
          "Pilihan paket dicatat. Pembayaran belum tersedia, jadi paketmu belum berubah.",
      },
      { status: 202, headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    console.error("POST /api/billing/subscription failed", error);
    return jsonError(500, "Pilihan paket gagal disimpan.");
  }
}

/**
 * Cancels a paid plan, or drops a pending change.
 *
 * Both are the same button to the person pressing it. A paid plan ends at the
 * close of the period, never immediately — the month is already paid for. An
 * account on the free tier with nothing pending has nothing to cancel and is
 * told so by getting the free tier back, unchanged.
 */
export async function DELETE(): Promise<Response> {
  const accountId = await getAccountId();
  if (!accountId) {
    return jsonError(401, "Masuk dulu untuk mengelola paket.");
  }

  try {
    return Response.json(
      { subscription: await cancelSubscription(accountId) },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    console.error("DELETE /api/billing/subscription failed", error);
    return jsonError(500, "Pembatalan gagal diproses.");
  }
}

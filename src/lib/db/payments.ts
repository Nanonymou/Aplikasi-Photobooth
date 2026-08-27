import "server-only";

import { query, transaction } from "@/lib/db/client";
import type { BillingCycle, PlanId } from "@/lib/billing/plans";

/**
 * Payments, and the one thing that may promote a subscription.
 *
 * `requestUpgrade` records an intent and leaves the account where it was. This
 * module holds the other half: a payment that actually settled, and the write
 * that finally moves the plan. Nothing else in the app is allowed to set a paid
 * plan, which is what keeps "chose Pro" and "paid for Pro" from becoming the
 * same event.
 */

export type PaymentStatus = "pending" | "paid" | "failed" | "expired";

export interface Payment {
  id: string;
  accountId: string;
  plan: Exclude<PlanId, "gratis">;
  cycle: BillingCycle;
  amountIdr: number;
  status: PaymentStatus;
  provider: string;
  providerRef: string;
  createdAt: string;
  paidAt: string | null;
}

interface PaymentRow {
  id: string;
  account_id: string;
  plan: Exclude<PlanId, "gratis">;
  cycle: BillingCycle;
  amount_idr: number;
  status: PaymentStatus;
  provider: string;
  provider_ref: string;
  created_at: Date;
  paid_at: Date | null;
}

function toPayment(row: PaymentRow): Payment {
  return {
    id: row.id,
    accountId: row.account_id,
    plan: row.plan,
    cycle: row.cycle,
    amountIdr: row.amount_idr,
    status: row.status,
    provider: row.provider,
    providerRef: row.provider_ref,
    createdAt: row.created_at.toISOString(),
    paidAt: row.paid_at?.toISOString() ?? null,
  };
}

/** How many months one cycle covers, for the invoice and the period end. */
export function monthsIn(cycle: BillingCycle): number {
  return cycle === "yearly" ? 12 : 1;
}

/** Records a payment that has been started but not yet settled. */
export async function createPayment(input: {
  accountId: string;
  plan: Exclude<PlanId, "gratis">;
  cycle: BillingCycle;
  amountIdr: number;
  provider: string;
  providerRef: string;
}): Promise<Payment> {
  const rows = await query<PaymentRow>(
    `insert into payments
       (account_id, plan, cycle, amount_idr, provider, provider_ref)
     values ($1, $2, $3, $4, $5, $6)
     returning *`,
    [
      input.accountId,
      input.plan,
      input.cycle,
      input.amountIdr,
      input.provider,
      input.providerRef,
    ],
  );

  return toPayment(rows[0]);
}

/** An account's receipts, newest first. */
export async function listPayments(
  accountId: string,
  limit = 24,
): Promise<Payment[]> {
  const rows = await query<PaymentRow>(
    `select * from payments
      where account_id = $1
      order by created_at desc
      limit $2`,
    [accountId, limit],
  );

  return rows.map(toPayment);
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type SettleOutcome =
  | { outcome: "promoted"; payment: Payment }
  | { outcome: "already-settled"; payment: Payment }
  | { outcome: "recorded"; payment: Payment }
  | { outcome: "unknown-reference" }
  | { outcome: "amount-mismatch"; expected: number; received: number };

/**
 * Settles a payment the gateway has told us about, and promotes the account.
 *
 * Everything here is one transaction, and the payment row is locked first. A
 * gateway retries its webhook — all of them do, and more than once — so two
 * deliveries of the same notice can arrive at the same instant. Without the lock
 * both would see `pending`, both would promote, and the account would be paid up
 * two months for one payment.
 *
 * The amount is checked against what we recorded when the charge started. A
 * notice is only trusted as far as its signature, and a signature proves the
 * message came from the gateway — not that it is about the thing we asked for.
 *
 * The plan's period is extended from whichever is later, now or the end of what
 * is already paid for. Renewing early must add a month, not restart one.
 */
export async function settlePayment(input: {
  reference: string;
  providerRef: string;
  provider: string;
  status: PaymentStatus;
  amountIdr: number;
}): Promise<SettleOutcome> {
  // The reference travels through the gateway and comes back as whatever the
  // notice says it is, so it reaches here as an arbitrary string. `id` is a
  // uuid column: anything else is not a payment of ours, and asking Postgres to
  // cast it would be an error rather than an answer.
  if (!UUID_PATTERN.test(input.reference)) return { outcome: "unknown-reference" };

  return transaction(async (client) => {
    const { rows } = await client.query<PaymentRow>(
      "select * from payments where id = $1 for update",
      [input.reference],
    );

    const existing = rows[0];
    if (!existing) return { outcome: "unknown-reference" };

    if (existing.status !== "pending") {
      return { outcome: "already-settled", payment: toPayment(existing) };
    }

    if (existing.amount_idr !== input.amountIdr) {
      return {
        outcome: "amount-mismatch",
        expected: existing.amount_idr,
        received: input.amountIdr,
      };
    }

    const { rows: updated } = await client.query<PaymentRow>(
      `update payments
          set status = $2::payment_status,
              provider_ref = $3,
              paid_at = case when $2::payment_status = 'paid' then now() else null end
        where id = $1
       returning *`,
      [input.reference, input.status, input.providerRef],
    );

    const payment = toPayment(updated[0]);
    if (input.status !== "paid") {
      return { outcome: "recorded", payment };
    }

    await client.query(
      `insert into subscriptions
         (account_id, plan, cycle, status, price_idr, current_period_end)
       values ($1, $2, $3, 'active', $4, now() + make_interval(months => $5))
       on conflict (account_id) do update
          set plan = excluded.plan,
              cycle = excluded.cycle,
              status = 'active',
              price_idr = excluded.price_idr,
              cancel_at_period_end = false,
              pending_plan = null,
              pending_cycle = null,
              current_period_end =
                greatest(now(), coalesce(subscriptions.current_period_end, now()))
                  + make_interval(months => $5)`,
      [
        payment.accountId,
        payment.plan,
        payment.cycle,
        // The agreed monthly price, derived from what was actually charged.
        Math.round(payment.amountIdr / monthsIn(payment.cycle)),
        monthsIn(payment.cycle),
      ],
    );

    return { outcome: "promoted", payment };
  });
}

import "server-only";

import { query } from "@/lib/db/client";
import type { BillingCycle, PlanId } from "@/lib/billing/plans";

/**
 * What each plan costs today.
 *
 * `plan_prices` (migration 0028) keeps the history — a price change is a new row
 * with an `effective_from` rather than an edit — so "the price" is always a
 * question about a moment. This reads the one moment almost everybody means:
 * now.
 *
 * Kept apart from `subscriptions` on purpose. That table answers "what did this
 * account agree to", which is a snapshot and must not move when the catalogue
 * does; this answers "what would somebody pay if they signed up today". Reading
 * one where the other is meant is exactly the mistake 0028 exists to prevent.
 */

export interface PlanPrice {
  plan: PlanId;
  cycle: BillingCycle;
  /** Rupiah per month. Yearly rows carry the discounted monthly rate. */
  priceIdr: number;
}

interface PriceRow {
  plan: PlanId;
  cycle: BillingCycle;
  price_idr: number;
}

/**
 * The price in effect for every plan and cycle, at `at` (default: now).
 *
 * `distinct on` takes the first row per group, and the ordering puts the newest
 * price that has already started first — one pass over the index the migration
 * created, rather than a correlated subquery per plan.
 *
 * A date in the past answers "what was somebody charged last March", which is
 * the question a receipt raises and the reason the history is kept at all.
 */
export async function currentPlanPrices(at?: Date): Promise<PlanPrice[]> {
  const rows = await query<PriceRow>(
    `select distinct on (plan, cycle) plan, cycle, price_idr
       from plan_prices
      where effective_from <= $1
      order by plan, cycle, effective_from desc`,
    [at ?? new Date()],
  );

  return rows.map((row) => ({
    plan: row.plan,
    cycle: row.cycle,
    priceIdr: row.price_idr,
  }));
}

/** One price, or null when a plan and cycle has never been priced. */
export async function planPrice(
  plan: PlanId,
  cycle: BillingCycle,
  at?: Date,
): Promise<number | null> {
  const rows = await query<{ price_idr: number }>(
    `select price_idr from plan_prices
      where plan = $1 and cycle = $2 and effective_from <= $3
      order by effective_from desc
      limit 1`,
    [plan, cycle, at ?? new Date()],
  );

  return rows[0]?.price_idr ?? null;
}

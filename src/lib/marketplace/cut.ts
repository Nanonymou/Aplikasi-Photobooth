/**
 * The platform's share of a template sale.
 *
 * Stated once, here, because three places need the same number and they must
 * agree: the endpoint that splits a payment, the dashboard that reports what a
 * creator earned, and the copy that tells them what the cut is. A rate written
 * down twice is a rate that will be changed once.
 *
 * Not `server-only` — the number is on the pricing page and in the dashboard,
 * both of which run in the browser. It is not a secret; it is a promise.
 */
export const PLATFORM_CUT = 0.15;

export interface PriceSplit {
  /** What the buyer pays, in whole rupiah. */
  amountIdr: number;
  /** What the platform keeps. */
  platformCutIdr: number;
  /** What the creator earns. */
  netIdr: number;
}

/**
 * Splits a price into the platform's share and the creator's.
 *
 * The creator's share is the remainder rather than a second rounding, so the
 * two always add back up to what was charged — which is exactly what
 * `template_purchases_split_adds_up` insists on, and what stops a stray rupiah
 * from going missing on every odd-priced sale.
 */
export function splitPrice(amountIdr: number): PriceSplit {
  const platformCutIdr = Math.round(amountIdr * PLATFORM_CUT);
  return { amountIdr, platformCutIdr, netIdr: amountIdr - platformCutIdr };
}

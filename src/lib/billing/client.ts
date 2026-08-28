"use client";

import { useSyncExternalStore } from "react";

import type { BillingCycle, PlanId } from "@/lib/billing/plans";

/**
 * The account's subscription, as the screens read it.
 *
 * `GET /api/billing/subscription` answers the whole picture at once — the plan,
 * its cycle and period, what the account has used against its limits, and the
 * current price of every plan from `plan_prices`.
 *
 * Prices come from there rather than from the compiled `PLANS` constants, and
 * that is the point: a price that changed last month is a row, and a constant
 * cannot express one. The two `@deprecated` fields on `Plan` exist only until
 * every screen reads this instead.
 */

export interface Subscription {
  plan: PlanId;
  cycle: BillingCycle;
  status: string;
  priceIdr: number;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  pendingPlan: PlanId | null;
  pendingCycle: BillingCycle | null;
}

export interface PlanPrice {
  plan: PlanId;
  cycle: BillingCycle;
  priceIdr: number;
}

export interface BillingState {
  subscription: Subscription;
  usage: { designs: number };
  limits: { designs: number | null };
  prices: PlanPrice[];
  signedIn: boolean;
}

async function refusal(response: Response, fallback: string): Promise<string> {
  const payload: unknown = await response.json().catch(() => null);
  const data =
    typeof payload === "object" && payload !== null
      ? (payload as Record<string, unknown>)
      : {};
  return typeof data.error === "string" ? data.error : fallback;
}

export async function fetchBilling(): Promise<BillingState> {
  const response = await fetch("/api/billing/subscription", {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(await refusal(response, "Langganan gagal dimuat."));
  }
  return (await response.json()) as BillingState;
}

/** The current price of one plan on one cycle, or null if it has none. */
export function priceFor(
  prices: PlanPrice[],
  plan: PlanId,
  cycle: BillingCycle,
): number | null {
  return (
    prices.find((entry) => entry.plan === plan && entry.cycle === cycle)
      ?.priceIdr ?? null
  );
}

export interface Checkout {
  paymentId: string;
  amountIdr: number;
  redirectUrl: string;
}

/**
 * Starts a payment for a plan.
 *
 * The amount is not sent. The server reads it from `plan_prices`, because a
 * checkout where the customer names their own price looks exactly like a working
 * checkout until somebody reads the takings.
 */
export async function startCheckout(
  plan: Exclude<PlanId, "gratis">,
  cycle: BillingCycle,
): Promise<Checkout> {
  const response = await fetch("/api/billing/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ plan, cycle }),
  });
  if (!response.ok) {
    throw new Error(await refusal(response, "Pembayaran gagal dimulai."));
  }
  return (await response.json()) as Checkout;
}

/* -------------------------------------------------------------------------- */
/* The shared read                                                            */
/* -------------------------------------------------------------------------- */

/**
 * The billing state, fetched once and shared.
 *
 * Three panels on the subscription page ask the same question — which plan am I
 * on, what does it cost, how much have I used — and three separate fetches would
 * let them disagree with each other for a moment. One store, one answer.
 */
let state: BillingState | null = null;
let inFlight: Promise<void> | null = null;
const listeners = new Set<() => void>();

async function load(): Promise<void> {
  try {
    state = await fetchBilling();
  } catch {
    // The page renders its empty shape rather than an error: a subscription
    // screen that cannot reach the server still has to show the tiers.
    state = null;
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  inFlight ??= load().finally(() => {
    inFlight = null;
  });
  return () => {
    listeners.delete(listener);
  };
}

/** Re-reads it, for after a payment settles. */
export async function refreshBilling(): Promise<void> {
  await load();
}

/** The current billing state, or null while it is still loading. */
export function useBilling(): BillingState | null {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => null,
  );
}

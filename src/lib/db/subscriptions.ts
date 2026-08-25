import "server-only";

import { query } from "@/lib/db/client";
import type { BillingCycle, PlanId } from "@/lib/billing/plans";

/**
 * An account's plan.
 *
 * The row records a decision and an entitlement — what was chosen, whether it
 * has been paid for, and until when. What each plan *is* stays in the app, where
 * the pricing page can be edited without a migration.
 *
 * An account with no row is on the free tier. That is not a missing record to
 * repair: it is the default said with less writing, and reading a plan must
 * never be a write.
 */

export type SubscriptionStatus = "active" | "pending" | "canceled";

export interface Subscription {
  plan: PlanId;
  cycle: BillingCycle;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  /** The plan being paid for, while a change is pending. */
  pendingPlan: PlanId | null;
  pendingCycle: BillingCycle | null;
}

interface SubscriptionRow {
  plan: PlanId;
  cycle: BillingCycle;
  status: SubscriptionStatus;
  current_period_end: Date | null;
  cancel_at_period_end: boolean;
  pending_plan: PlanId | null;
  pending_cycle: BillingCycle | null;
}

export const FREE_PLAN: Subscription = {
  plan: "gratis",
  cycle: "monthly",
  status: "active",
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  pendingPlan: null,
  pendingCycle: null,
};

function toSubscription(row: SubscriptionRow): Subscription {
  return {
    plan: row.plan,
    cycle: row.cycle,
    status: row.status,
    currentPeriodEnd: row.current_period_end?.toISOString() ?? null,
    cancelAtPeriodEnd: row.cancel_at_period_end,
    pendingPlan: row.pending_plan,
    pendingCycle: row.pending_cycle,
  };
}

/** The account's plan, or the free tier when it has never chosen one. */
export async function getSubscription(
  accountId: string,
): Promise<Subscription> {
  const rows = await query<SubscriptionRow>(
    "select * from subscriptions where account_id = $1",
    [accountId],
  );

  return rows[0] ? toSubscription(rows[0]) : FREE_PLAN;
}

/**
 * Records that someone chose a paid plan, without granting it.
 *
 * This is the half of checkout that exists: the intent is stored, the account
 * stays exactly where it was, and only a confirmed payment may move it. Writing
 * `plan` here instead would be a checkout that charges nobody — the kind of
 * shortcut that is invisible until the month the invoices do not add up.
 *
 * Choosing the same pending plan twice is idempotent: someone clicking upgrade
 * again after a failed payment is repeating themselves, not asking for a second
 * subscription.
 */
export async function requestUpgrade(
  accountId: string,
  plan: Exclude<PlanId, "gratis">,
  cycle: BillingCycle,
): Promise<Subscription> {
  const rows = await query<SubscriptionRow>(
    `insert into subscriptions (account_id, status, pending_plan, pending_cycle)
     values ($1, 'pending', $2, $3)
     on conflict (account_id) do update
        set status = 'pending',
            pending_plan = excluded.pending_plan,
            pending_cycle = excluded.pending_cycle
     returning *`,
    [accountId, plan, cycle],
  );

  return toSubscription(rows[0]);
}

/**
 * Cancels whatever is outstanding.
 *
 * Two things can be: a pending upgrade, which is simply dropped and leaves the
 * account exactly where it was, and a paid plan, which ends at the close of the
 * period rather than now — the month is already paid for, and taking the
 * features away the moment someone clicks cancel is charging for something and
 * then withholding it.
 *
 * Both are the same button to the person pressing it, so they are one call
 * here. An account on the free tier with nothing pending is left alone.
 */
export async function cancelSubscription(
  accountId: string,
): Promise<Subscription> {
  const rows = await query<SubscriptionRow>(
    `update subscriptions
        set pending_plan = null,
            pending_cycle = null,
            status = case when status = 'pending' then 'active' else status end,
            cancel_at_period_end = plan <> 'gratis'
      where account_id = $1
     returning *`,
    [accountId],
  );

  return rows[0] ? toSubscription(rows[0]) : FREE_PLAN;
}

export interface PlanUsage {
  designs: number;
}

/**
 * What the account has actually used, for the status card.
 *
 * Counted across every owner id the person holds, for the same reason the
 * gallery lists them together: a limit that only saw the current browser would
 * be a different limit on every device.
 */
export async function planUsage(owners: string[]): Promise<PlanUsage> {
  if (owners.length === 0) return { designs: 0 };

  const rows = await query<{ designs: string }>(
    `select count(*) as designs
       from designs
      where owner_id = any($1::uuid[]) and deleted_at is null`,
    [owners],
  );

  return { designs: Number(rows[0]?.designs ?? 0) };
}

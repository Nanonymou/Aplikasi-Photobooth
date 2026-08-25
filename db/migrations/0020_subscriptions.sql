-- Which plan an account is on.
--
-- One row per account, created the first time anything asks — an account with no
-- row is on the free tier, which is the same thing said with less writing. The
-- row exists to record what someone chose and what they are owed until, not to
-- be the source of the plans themselves: prices and feature lists live in the
-- app, because they are copy that changes with a marketing decision and would be
-- wrong here the moment somebody edited the pricing page.
--
-- `status` is what keeps this honest in the absence of a payment provider. A
-- paid plan can be *chosen* without being paid for, and the difference between
-- "wants Pro" and "has Pro" is the whole of the business logic. So an upgrade
-- lands as `pending` and nothing but a confirmed payment may move it to
-- `active` — a row that granted the plan on request would be a checkout that
-- charges nobody.

create type subscription_status as enum ('active', 'pending', 'canceled');
create type billing_cycle as enum ('monthly', 'yearly');

create table subscriptions (
  -- The account, not an owner cookie: a plan follows the person, and a booth
  -- guest with no account is on the free tier by definition.
  account_id uuid primary key,

  -- Matches the plan ids the app ships. Deliberately text with a check rather
  -- than an enum: a new tier should be a deploy, not a migration on a type that
  -- other tables would then start depending on.
  plan text not null default 'gratis'
    check (plan in ('gratis', 'pro', 'studio')),
  cycle billing_cycle not null default 'monthly',
  status subscription_status not null default 'active',

  -- What the account is entitled to until, when it is paying for something.
  -- Null on the free tier, which never ends.
  current_period_end timestamptz,
  -- Set by a cancellation: the plan stays until the period runs out, because
  -- the month was already paid for.
  cancel_at_period_end boolean not null default false,

  -- The plan being paid for, while `status` is pending. Kept apart from `plan`
  -- so a failed upgrade leaves the account exactly where it was rather than
  -- somewhere between two tiers.
  pending_plan text check (pending_plan is null or pending_plan in ('pro', 'studio')),
  pending_cycle billing_cycle,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- The free tier is never pending and never has a period; a paid one always
  -- has an end date once it is active. Without this a row could claim to be
  -- active Pro forever with nothing to renew.
  constraint subscriptions_free_is_simple check (
    plan <> 'gratis' or (current_period_end is null and cancel_at_period_end = false)
  ),
  constraint subscriptions_paid_has_period check (
    plan = 'gratis' or status <> 'active' or current_period_end is not null
  ),
  -- A pending change carries both halves of what was chosen, or neither.
  constraint subscriptions_pending_pair check (
    (pending_plan is null) = (pending_cycle is null)
  ),
  constraint subscriptions_pending_status check (
    status <> 'pending' or pending_plan is not null
  )
);

create trigger subscriptions_touch_updated_at
  before update on subscriptions
  for each row execute function touch_updated_at();

-- The renewal sweep reads this: paid rows whose period has run out.
create index subscriptions_renewal_idx
  on subscriptions (current_period_end)
  where current_period_end is not null;

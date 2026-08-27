-- Payments: the record that a plan was actually paid for.
--
-- `subscriptions` deliberately never moves on request (migration 0020) — a
-- chosen plan lands in `pending_plan` and stays there. This is the table that
-- lets it move: one row per attempt to pay, and only a row that reached `paid`
-- may promote an account.
--
-- Separate from `subscriptions` because they answer different questions and have
-- different lifetimes. A subscription is the state now, one row per account,
-- overwritten as it changes. A payment is an event that happened, kept forever,
-- and the only thing an argument about a charge can be settled from. Folding the
-- second into the first would mean an account's billing history is whatever its
-- current row happens to say — which is to say, gone.

create type payment_status as enum ('pending', 'paid', 'failed', 'expired');

create table payments (
  id uuid primary key default gen_random_uuid(),

  -- No foreign key, for the same reason `role_changes` has none: a receipt has
  -- to outlive the account it belongs to. An account deleted next year does not
  -- make last year's payment stop having happened.
  account_id uuid not null,

  -- What was bought. Recorded here rather than read from the subscription later,
  -- because by then the subscription will have moved on.
  plan text not null check (plan in ('pro', 'studio')),
  cycle billing_cycle not null,

  -- What was charged, in whole rupiah. The amount for the *whole* invoice — a
  -- yearly cycle is twelve months of the monthly rate — so this is the number on
  -- the receipt, not the per-month figure the pricing page quotes.
  amount_idr integer not null check (amount_idr > 0),

  status payment_status not null default 'pending',

  -- Which gateway, and its own id for this payment. Both are needed: the same
  -- reference can exist at two providers, and a provider swap must not make two
  -- unrelated payments look like one.
  provider text not null check (length(btrim(provider)) between 1 and 40),
  provider_ref text not null check (length(btrim(provider_ref)) between 1 and 200),

  -- Why a webhook that arrives twice cannot pay for a month twice. The gateway
  -- decides when to retry and how often, and every one of them retries; without
  -- this the second delivery is a second month.
  constraint payments_provider_ref_unique unique (provider, provider_ref),

  created_at timestamptz not null default now(),
  paid_at timestamptz,

  -- A paid payment has a time it was paid at, and an unpaid one has not. Stated
  -- rather than assumed, because "paid, at null" is the row that makes a report
  -- silently undercount a month's takings.
  constraint payments_paid_has_time
    check ((status = 'paid') = (paid_at is not null))
);

comment on table payments is
  'One row per attempt to pay. Only a paid row may promote a subscription.';

-- An account's receipts, newest first: the billing history on the settings
-- screen, and the first thing anybody looks at when a charge is questioned.
create index payments_account_idx on payments (account_id, created_at desc);

-- The sweep that expires abandoned checkouts, and the report that asks how many
-- are stuck. Partial, because settled payments are the many and the interesting
-- ones are the few.
create index payments_pending_idx
  on payments (created_at)
  where status = 'pending';

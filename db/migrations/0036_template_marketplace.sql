-- Selling a template, and what the creator dashboard reports on.
--
-- A publication (migration 0034) is a design somebody put on the wall. Most are
-- free. A price turns one into a listing, and everything below exists because
-- money changed hands: a receipt per sale, and a record of what was paid out to
-- the person who made it.
--
-- `payments` (0029) is not reused. That table is subscription-shaped — it has a
-- `plan` and a `cycle`, both `not null`, and its constraints say a payment is
-- for one of three plans. Widening it to also mean "a template" would mean
-- making those nullable, which is to say deleting the rules that make it
-- trustworthy. Two kinds of purchase, two tables, the same lessons applied to
-- each.

alter table published_designs
  -- Whole rupiah. Zero means free, which is what almost everything on the wall
  -- is; a listing is a publication that happens to cost something.
  add column price_idr integer not null default 0 check (price_idr >= 0);

comment on column published_designs.price_idr is
  'Rupiah to use this template. 0 is free, which is the default and the common case.';

-- Paid listings, for the marketplace view of the wall.
create index published_designs_paid_idx
  on published_designs (price_idr, published_at desc)
  where unpublished_at is null and price_idr > 0;

create type purchase_status as enum ('pending', 'paid', 'failed', 'expired');

create table template_purchases (
  id uuid primary key default gen_random_uuid(),

  -- What was bought. No cascade: a receipt has to survive the seller taking the
  -- listing down, or a buyer's history would quietly lose entries and their
  -- access to something they paid for would have no record behind it.
  published_id uuid not null references published_designs (id) on delete restrict,

  -- Who bought it, as the owner id their browser already carries — buying is
  -- allowed before an account, like everything else a guest does here.
  buyer_owner_id uuid not null,

  -- Who gets paid. Copied at purchase rather than read through the listing: the
  -- money is owed to whoever sold it that day, whatever happens to the row after.
  seller_account_id uuid not null,

  -- What the buyer paid, what the platform kept, and what the seller earned.
  -- All three stored rather than two stored and one derived: the cut is a rate
  -- that will change, and a receipt recomputed at today's rate is not a receipt.
  amount_idr integer not null check (amount_idr > 0),
  platform_cut_idr integer not null check (platform_cut_idr >= 0),
  net_idr integer not null check (net_idr >= 0),
  constraint template_purchases_split_adds_up
    check (platform_cut_idr + net_idr = amount_idr),

  status purchase_status not null default 'pending',

  provider text not null check (length(btrim(provider)) between 1 and 40),
  provider_ref text not null check (length(btrim(provider_ref)) between 1 and 200),
  -- Why a webhook delivered twice does not sell the same template twice. Every
  -- gateway retries; this is what makes the second delivery harmless.
  constraint template_purchases_provider_ref_unique unique (provider, provider_ref),

  created_at timestamptz not null default now(),
  paid_at timestamptz,
  constraint template_purchases_paid_has_time
    check ((status = 'paid') = (paid_at is not null))
);

comment on table template_purchases is
  'One row per attempt to buy a template. Only a paid row grants access or earns a payout.';

-- A buyer's library: what they have paid for, so the editor can let them use it.
create index template_purchases_buyer_idx
  on template_purchases (buyer_owner_id, created_at desc)
  where status = 'paid';

-- A seller's sales, which is what the creator dashboard reports on.
create index template_purchases_seller_idx
  on template_purchases (seller_account_id, created_at desc)
  where status = 'paid';

-- Payouts: the money actually leaving for the creator.
--
-- Separate from the purchases that earned it because they answer different
-- questions and settle on different days. A sale happens the moment somebody
-- buys; a payout happens on a schedule, covering a period, and can fail on its
-- own without any of the sales in it being in doubt.
create type payout_status as enum ('menunggu', 'diproses', 'dibayar', 'gagal');

create table creator_payouts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,

  -- The month it covers, as its first day. A date rather than free text so two
  -- payouts for the same month are impossible rather than merely unlikely.
  period date not null,
  amount_idr integer not null check (amount_idr > 0),
  status payout_status not null default 'menunggu',

  -- When it is scheduled for, and when it actually moved.
  scheduled_for date not null,
  paid_at timestamptz,
  constraint creator_payouts_paid_has_time
    check ((status = 'dibayar') = (paid_at is not null)),

  -- Why, when it did not. It survives a later success on purpose: a payout that
  -- failed once and then went through is a thing the creator will ask about, and
  -- the answer is only in this column.
  failure_reason text check (
    failure_reason is null or length(btrim(failure_reason)) between 1 and 200
  ),
  constraint creator_payouts_failure_has_reason
    check (status <> 'gagal' or failure_reason is not null),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- One payout per creator per month. A second one for the same period is a
  -- double payment, and it should be impossible rather than caught in review.
  unique (account_id, period)
);

comment on table creator_payouts is
  'One row per creator per month. Unique on (account, period) so nobody is paid twice for it.';

create trigger creator_payouts_touch_updated_at
  before update on creator_payouts
  for each row execute function touch_updated_at();

-- A creator's payout history, newest first.
create index creator_payouts_account_idx
  on creator_payouts (account_id, period desc);

-- The run that pays everybody: what is due, oldest first.
create index creator_payouts_due_idx
  on creator_payouts (scheduled_for)
  where status in ('menunggu', 'diproses');

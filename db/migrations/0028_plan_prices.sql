-- What each plan costs, and what each subscriber actually agreed to pay.
--
-- The plan catalogue in src/lib/billing/plans.ts stays where it is: names,
-- taglines, the bullet lists on the pricing page. That is copy, it changes
-- because marketing decided something, and a table would only mean a database
-- write to fix a typo.
--
-- Money is the other half, and it does not behave like copy. Two things break
-- the moment a price changes in a constant:
--
--   1. Every existing subscriber silently becomes someone paying the new price.
--      There is no row anywhere saying what they agreed to, so a receipt, an
--      invoice, or an argument about a charge has nothing to be answered from.
--   2. The old price stops existing. Grandfathering somebody in is not
--      expressible — the only price the system knows is today's.
--
-- So prices move into the database, and a price change becomes a new row rather
-- than an edit. `subscriptions.price_idr` is then a snapshot: what this account
-- agreed to, kept even after the catalogue moves on.

create table plan_prices (
  plan text not null check (plan in ('gratis', 'pro', 'studio')),
  cycle billing_cycle not null,

  -- Whole rupiah per month. Yearly rows carry the discounted monthly rate,
  -- because that is the number the pricing page quotes and the number a
  -- subscriber recognises; the annual charge is twelve of them.
  --
  -- Integer, not numeric: rupiah has no subunit anybody quotes, and a currency
  -- in a float is a rounding error waiting to be found on somebody's invoice.
  price_idr integer not null check (price_idr >= 0),

  -- The free plan is free. Stated rather than assumed, because "gratis at
  -- 49.000" is the kind of row that only gets noticed by a customer.
  constraint plan_prices_free_is_free check (plan <> 'gratis' or price_idr = 0),

  -- When this price starts applying. A change is an insert, so the row that was
  -- true last March is still here to explain last March's charge.
  effective_from timestamptz not null default now(),

  -- Why it changed, for whoever reads this table a year from now.
  note text check (note is null or length(btrim(note)) between 1 and 200),

  primary key (plan, cycle, effective_from)
);

comment on table plan_prices is
  'Price history per plan and cycle. Copy lives in the app; money lives here.';

-- The everyday question is "what does Pro cost right now", which is the newest
-- row not in the future. Descending so that read is the first row of a scan.
create index plan_prices_current_idx
  on plan_prices (plan, cycle, effective_from desc);

-- Today's prices, matching src/lib/billing/plans.ts at the time of this
-- migration. Seeded here rather than left to a script: a price table that is
-- empty on its first read is worse than no price table, because every caller
-- then needs a fallback and the fallback is the constant we just moved away
-- from. Dated to the epoch so nothing predates them.
insert into plan_prices (plan, cycle, price_idr, effective_from, note) values
  ('gratis', 'monthly',      0, 'epoch', 'Harga awal.'),
  ('gratis', 'yearly',       0, 'epoch', 'Harga awal.'),
  ('pro',    'monthly',  49000, 'epoch', 'Harga awal.'),
  ('pro',    'yearly',   39000, 'epoch', 'Harga awal.'),
  ('studio', 'monthly', 149000, 'epoch', 'Harga awal.'),
  ('studio', 'yearly',  119000, 'epoch', 'Harga awal.');

-- What this account agreed to pay, per month, under its current plan.
--
-- A snapshot rather than a lookup: reading the catalogue at display time would
-- show every subscriber today's price, which is exactly the bug this migration
-- exists to close.
alter table subscriptions
  add column price_idr integer check (price_idr is null or price_idr >= 0);

-- Existing rows agreed to whatever the catalogue said when they signed up, and
-- there is no record of that — so the price in effect now is the only honest
-- answer available, and it is the right one while no price has ever changed.
update subscriptions s
   set price_idr = p.price_idr
  from plan_prices p
 where p.plan = s.plan
   and p.cycle = s.cycle;

alter table subscriptions
  alter column price_idr set not null,
  add constraint subscriptions_free_costs_nothing
    check (plan <> 'gratis' or price_idr = 0);

comment on column subscriptions.price_idr is
  'Rupiah per month this account agreed to. Snapshot, not a lookup — it survives a price change.';

import "server-only";

import { query, transaction } from "@/lib/db/client";
import { splitPrice } from "@/lib/marketplace/cut";

/**
 * Selling a template, from the maker's side.
 *
 * A publication (migration 0034) is a design somebody put on the wall; a price
 * (0036) turns one into a listing. This module is what the creator dashboard
 * manages — which of my publications are for sale, and for how much. What a
 * buyer does with a listing, and what a sale earns, live elsewhere.
 */

/**
 * The floor and the ceiling on a price, in whole rupiah.
 *
 * Zero is always allowed and means free — most of the wall is. Above zero there
 * is a floor because the platform's cut and the gateway's fee both come out of
 * the same payment: a Rp 1.000 sale earns the maker less than the fee costs, so
 * it is a listing that only looks like income. The ceiling is a typo guard —
 * nobody means to price a photostrip template at nine million rupiah, and the
 * one person who does can ask.
 */
export const PRICE_FLOOR_IDR = 5_000;
export const PRICE_CEILING_IDR = 1_000_000;

/** Whether a price is one this marketplace will take. */
export function isSellablePrice(price: number): boolean {
  if (!Number.isInteger(price) || price < 0) return false;
  if (price === 0) return true;
  return price >= PRICE_FLOOR_IDR && price <= PRICE_CEILING_IDR;
}

export interface CreatorTemplate {
  id: string;
  slug: string;
  title: string;
  category: string;
  /** Whole rupiah. 0 is free. */
  price: number;
  /** Whether it is on the wall right now. */
  live: boolean;
  likes: number;
  remixes: number;
  /** How many people have paid for it. Zero for anything free. */
  sold: number;
  publishedAt: string;
  updatedAt: string;
}

interface TemplateRow {
  id: string;
  slug: string;
  title: string;
  category: string;
  price_idr: number;
  live: boolean;
  likes: string;
  remixes: string;
  sold: string;
  published_at: Date;
  updated_at: Date;
}

function toTemplate(row: TemplateRow): CreatorTemplate {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category,
    price: row.price_idr,
    live: row.live,
    likes: Number(row.likes),
    remixes: Number(row.remixes),
    sold: Number(row.sold),
    publishedAt: row.published_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

const TEMPLATE_SELECT = `
  p.id, p.slug, p.title, p.category, p.price_idr,
  p.unpublished_at is null as live,
  p.published_at, p.updated_at,
  (select count(*) from design_likes l where l.published_id = p.id) as likes,
  (select count(*) from designs d where d.remix_of_id = p.id) as remixes,
  (select count(*) from template_purchases t
    where t.published_id = p.id and t.status = 'paid') as sold
`;

/**
 * Everything the caller has published, priced or not.
 *
 * Withdrawn ones are included, and have to be: the list is where a maker puts
 * something back up or changes what it costs before doing so, and a management
 * screen that hides half of what it manages is how people conclude their work
 * was deleted.
 *
 * The counts are computed, not stored — the same choice `listShowcase` makes,
 * for the same reason: a denormalised total is a number that drifts and then
 * has to be explained, and these are index lookups over small sets.
 */
export async function listCreatorTemplates(
  accountId: string,
): Promise<CreatorTemplate[]> {
  const rows = await query<TemplateRow>(
    `select ${TEMPLATE_SELECT}
       from published_designs p
      where p.account_id = $1
      order by p.published_at desc`,
    [accountId],
  );

  return rows.map(toTemplate);
}

export type PriceResult =
  | { ok: true; template: CreatorTemplate }
  | { ok: false; reason: "not-found" };

/**
 * Sets what a template costs, or makes it free again.
 *
 * Only the account that published it, checked in the `where` rather than read
 * first and trusted — pricing somebody else's work is the marketplace version of
 * publishing it under your own name.
 *
 * A price change is not retroactive and does not need to be: every purchase
 * stores the amount it was made at (`template_purchases.amount_idr`), so
 * yesterday's buyer keeps yesterday's receipt no matter what the listing says
 * today. That is what makes repricing a listing that has already sold safe, and
 * why nothing here refuses to do it.
 *
 * Withdrawn templates can be priced too. Deciding what something will cost
 * before putting it back on the wall is the normal order of those two acts.
 */
export async function setTemplatePrice(
  accountId: string,
  slug: string,
  price: number,
): Promise<PriceResult> {
  // `returning`, not a second read: a data-modifying CTE's effects are invisible
  // to the rest of the same statement, so a `select` beside the `update` would
  // hand back the price it just replaced.
  const rows = await query<TemplateRow>(
    `update published_designs as p
        set price_idr = $3
      where p.slug = $1 and p.account_id = $2
     returning ${TEMPLATE_SELECT}`,
    [slug, accountId, price],
  );

  const row = rows[0];
  return row ? { ok: true, template: toTemplate(row) } : { ok: false, reason: "not-found" };
}

/* -------------------------------------------------------------------------- */
/* Buying one                                                                 */
/* -------------------------------------------------------------------------- */

export type PurchaseStatus = "pending" | "paid" | "failed" | "expired";

export interface TemplatePurchase {
  id: string;
  publishedId: string;
  buyerOwnerId: string;
  sellerAccountId: string;
  amountIdr: number;
  platformCutIdr: number;
  netIdr: number;
  status: PurchaseStatus;
  provider: string;
  providerRef: string;
  createdAt: string;
  paidAt: string | null;
}

interface PurchaseRow {
  id: string;
  published_id: string;
  buyer_owner_id: string;
  seller_account_id: string;
  amount_idr: number;
  platform_cut_idr: number;
  net_idr: number;
  status: PurchaseStatus;
  provider: string;
  provider_ref: string;
  created_at: Date;
  paid_at: Date | null;
}

function toPurchase(row: PurchaseRow): TemplatePurchase {
  return {
    id: row.id,
    publishedId: row.published_id,
    buyerOwnerId: row.buyer_owner_id,
    sellerAccountId: row.seller_account_id,
    amountIdr: row.amount_idr,
    platformCutIdr: row.platform_cut_idr,
    netIdr: row.net_idr,
    status: row.status,
    provider: row.provider,
    providerRef: row.provider_ref,
    createdAt: row.created_at.toISOString(),
    paidAt: row.paid_at?.toISOString() ?? null,
  };
}

/**
 * What a caller is allowed to do with a template.
 *
 * Answered for every publication, free or not, because "this one is free" is the
 * answer to the same question and the editor should not need a second call to
 * find it out.
 */
export interface TemplateLicense {
  slug: string;
  title: string;
  /** Whole rupiah. 0 means free, and free means licensed. */
  price: number;
  /** Whether the caller may use it. */
  licensed: boolean;
  /** When they bought it, when they did. */
  purchasedAt: string | null;
  /** Whether they made it. A maker never has to buy their own work. */
  mine: boolean;
}

interface LicenseRow {
  id: string;
  slug: string;
  title: string;
  price_idr: number;
  account_id: string;
  unpublished_at: Date | null;
  purchased_at: Date | null;
}

const LICENSE_SELECT = `
  p.id, p.slug, p.title, p.price_idr, p.account_id, p.unpublished_at,
  (select max(t.paid_at) from template_purchases t
    where t.published_id = p.id
      and t.status = 'paid'
      and t.buyer_owner_id = any($2::uuid[])) as purchased_at
`;

/**
 * Whether the caller may use a template, and why.
 *
 * `owners` is every identity they hold, not just their account: a template
 * bought before signing in belongs to the guest owner id their browser carried,
 * and checking only the account would tell somebody they had not paid for
 * something they had.
 *
 * A withdrawn template still licenses. Somebody who paid for it keeps it — the
 * maker taking a listing down ends the selling, not the sale.
 */
export async function getTemplateLicense(
  slug: string,
  owners: string[],
  accountId: string | null,
): Promise<TemplateLicense | null> {
  const rows = await query<LicenseRow>(
    `select ${LICENSE_SELECT} from published_designs p where p.slug = $1`,
    [slug, owners],
  );

  const row = rows[0];
  if (!row) return null;

  const mine = accountId !== null && row.account_id === accountId;

  return {
    slug: row.slug,
    title: row.title,
    price: row.price_idr,
    licensed: row.price_idr === 0 || mine || row.purchased_at !== null,
    purchasedAt: row.purchased_at?.toISOString() ?? null,
    mine,
  };
}

export type StartPurchaseResult =
  | { ok: true; purchase: TemplatePurchase; title: string }
  | {
      ok: false;
      reason: "not-found" | "withdrawn" | "free" | "own-template" | "already-owned";
    };

/**
 * Records the intent to buy, before any money moves.
 *
 * The price is read from the listing here and never taken from the request — a
 * checkout where the buyer names the amount looks exactly like a working
 * checkout until somebody reads the takings. The split is computed at the same
 * moment and stored with it, so the receipt keeps the rate that was in force
 * rather than whatever the rate becomes.
 *
 * Nothing here grants a licence. The row is `pending`; the licence appears when
 * the gateway says the money arrived, and only then.
 *
 * A withdrawn listing cannot be bought. A free one cannot either, and that is
 * not pedantry: sending somebody to a payment page for Rp0 is a dead end, and
 * they already have the thing.
 */
export async function startTemplatePurchase(input: {
  slug: string;
  buyerOwnerId: string;
  owners: string[];
  accountId: string;
  provider: string;
}): Promise<StartPurchaseResult> {
  const found = await query<LicenseRow>(
    `select ${LICENSE_SELECT} from published_designs p where p.slug = $1`,
    [input.slug, input.owners],
  );

  const listing = found[0];
  if (!listing) return { ok: false, reason: "not-found" };
  if (listing.unpublished_at !== null) return { ok: false, reason: "withdrawn" };
  if (listing.price_idr === 0) return { ok: false, reason: "free" };
  if (listing.account_id === input.accountId) {
    return { ok: false, reason: "own-template" };
  }
  if (listing.purchased_at !== null) {
    return { ok: false, reason: "already-owned" };
  }

  const split = splitPrice(listing.price_idr);

  // Minted here so it can stand in as the provider's reference until the
  // provider supplies its own: `(provider, provider_ref)` is unique, so a fixed
  // placeholder would make two people buying at the same moment collide.
  const id = crypto.randomUUID();

  const rows = await query<PurchaseRow>(
    `insert into template_purchases
       (id, published_id, buyer_owner_id, seller_account_id,
        amount_idr, platform_cut_idr, net_idr, provider, provider_ref)
     values ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $1::text)
     returning *`,
    [
      id,
      listing.id,
      input.buyerOwnerId,
      listing.account_id,
      split.amountIdr,
      split.platformCutIdr,
      split.netIdr,
      input.provider,
    ],
  );

  return { ok: true, purchase: toPurchase(rows[0]), title: listing.title };
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type SettlePurchaseOutcome =
  | { outcome: "licensed"; purchase: TemplatePurchase }
  | { outcome: "already-settled"; purchase: TemplatePurchase }
  | { outcome: "recorded"; purchase: TemplatePurchase }
  | { outcome: "unknown-reference" }
  | { outcome: "amount-mismatch"; expected: number; received: number };

/**
 * Settles a purchase the gateway has told us about.
 *
 * The same shape as `settlePayment`, and for the same reasons: one transaction,
 * the row locked before it is read, because every gateway retries its webhook
 * and two deliveries of one notice can arrive together. Here a double settle
 * would be harmless to the licence — owning something twice is owning it — but
 * it would count the sale twice in what a creator is owed, which is a payout
 * that has to be explained afterwards.
 *
 * The amount is checked against what the listing cost when the purchase started.
 * A signature proves the notice came from the gateway, not that it is about the
 * thing we asked for.
 */
export async function settleTemplatePurchase(input: {
  reference: string;
  providerRef: string;
  status: PurchaseStatus;
  amountIdr: number;
}): Promise<SettlePurchaseOutcome> {
  // The reference travels through the gateway and comes back as whatever the
  // notice says it is. `id` is a uuid column: anything else is not a purchase of
  // ours, and asking Postgres to cast it would be an error rather than an answer.
  if (!UUID_PATTERN.test(input.reference)) {
    return { outcome: "unknown-reference" };
  }

  return transaction(async (client) => {
    const { rows } = await client.query<PurchaseRow>(
      "select * from template_purchases where id = $1 for update",
      [input.reference],
    );

    const existing = rows[0];
    if (!existing) return { outcome: "unknown-reference" };

    if (existing.status !== "pending") {
      return { outcome: "already-settled", purchase: toPurchase(existing) };
    }

    if (existing.amount_idr !== input.amountIdr) {
      return {
        outcome: "amount-mismatch",
        expected: existing.amount_idr,
        received: input.amountIdr,
      };
    }

    const { rows: updated } = await client.query<PurchaseRow>(
      `update template_purchases
          set status = $2::purchase_status,
              provider_ref = $3,
              paid_at = case when $2::purchase_status = 'paid' then now() else null end
        where id = $1
       returning *`,
      [input.reference, input.status, input.providerRef],
    );

    const purchase = toPurchase(updated[0]);
    return {
      outcome: input.status === "paid" ? "licensed" : "recorded",
      purchase,
    };
  });
}

/* -------------------------------------------------------------------------- */
/* What a creator has earned                                                  */
/* -------------------------------------------------------------------------- */

/** One month of takings. `YYYY-MM`; the label is the screen's business. */
export interface MonthlyRevenue {
  month: string;
  grossIdr: number;
  netIdr: number;
  sold: number;
}

/** One template's lifetime performance. */
export interface TemplateRevenue {
  id: string;
  slug: string;
  title: string;
  /** What it costs today, which is not what every sale was made at. */
  priceIdr: number;
  sold: number;
  /** What buyers actually paid, summed. */
  grossIdr: number;
  netIdr: number;
}

export interface SaleRecord {
  id: string;
  slug: string;
  title: string;
  amountIdr: number;
  netIdr: number;
  /** Who bought it, by the name they chose. Never their email. */
  buyer: string;
  paidAt: string;
}

export type PayoutStatus = "menunggu" | "diproses" | "dibayar" | "gagal";

export interface PayoutRecord {
  id: string;
  /** The month it covers, as its first day. */
  period: string;
  amountIdr: number;
  status: PayoutStatus;
  scheduledFor: string;
  paidAt: string | null;
  failureReason: string | null;
}

export interface SalesSummary {
  grossIdr: number;
  netIdr: number;
  sold: number;
  /** Gross this calendar month, and the month before, for the comparison. */
  thisMonthIdr: number;
  lastMonthIdr: number;
  /** In payouts that have not been paid yet — including ones that failed. */
  pendingPayoutIdr: number;
  /** Earned in months no payout covers yet. */
  unscheduledIdr: number;
}

export interface CreatorSales {
  summary: SalesSummary;
  monthly: MonthlyRevenue[];
  templates: TemplateRevenue[];
  recent: SaleRecord[];
  payouts: PayoutRecord[];
}

/** How many months of history the chart shows, this one included. */
const REVENUE_MONTHS = 6;

/**
 * Everything the creator dashboard reports on, in one read.
 *
 * One call rather than five, because the screen shows them together and five
 * endpoints would mean five chances for the page to render a total that
 * disagrees with the rows beneath it.
 *
 * Only `paid` purchases count anywhere here. A pending row is somebody who
 * opened a payment page, and money that has not arrived has no business in a
 * figure a creator plans around.
 *
 * The totals are summed from the receipts rather than from the listings' current
 * prices, which is the whole point of storing the amount on the purchase: a
 * template repriced last week did not retroactively change what it earned.
 */
export async function getCreatorSales(
  accountId: string,
  recentLimit = 20,
): Promise<CreatorSales> {
  const [totals, unscheduled, monthly, templates, recent, payouts] = await Promise.all([
    query<{ gross: string; net: string; sold: string }>(
      `select coalesce(sum(amount_idr), 0) as gross,
              coalesce(sum(net_idr), 0) as net,
              count(*) as sold
         from template_purchases
        where seller_account_id = $1 and status = 'paid'`,
      [accountId],
    ),

    // Earned in a month no payout covers — over all of history, not just the
    // months the chart happens to show. Payouts are drawn up after a month
    // ends, so this is normally the recent ones; when it is an old one it is a
    // creator who has been owed money for a year, and that is precisely the
    // figure that must not quietly fall off the bottom of the window.
    query<{ net: string }>(
      `select coalesce(sum(t.net_idr), 0) as net
         from template_purchases t
        where t.seller_account_id = $1
          and t.status = 'paid'
          and not exists (
                select 1 from creator_payouts c
                 where c.account_id = $1
                   and c.period = date_trunc('month', t.paid_at)::date
              )`,
      [accountId],
    ),

    // `generate_series` and a left join, so a month with no sales comes back as
    // a zero rather than as a gap. A chart that silently skips the quiet months
    // draws a line with the wrong shape.
    query<{ month: string; gross: string; net: string; sold: string }>(
      `select to_char(m, 'YYYY-MM') as month,
              coalesce(sum(t.amount_idr), 0) as gross,
              coalesce(sum(t.net_idr), 0) as net,
              count(t.id) as sold
         from generate_series(
                date_trunc('month', now()) - make_interval(months => $2::int - 1),
                date_trunc('month', now()),
                interval '1 month'
              ) as m
         left join template_purchases t
                on t.seller_account_id = $1
               and t.status = 'paid'
               and t.paid_at >= m
               and t.paid_at < m + interval '1 month'
        group by m
        order by m`,
      [accountId, REVENUE_MONTHS],
    ),

    query<{
      id: string;
      slug: string;
      title: string;
      price_idr: number;
      sold: string;
      gross: string;
      net: string;
    }>(
      `select p.id, p.slug, p.title, p.price_idr,
              count(t.id) as sold,
              coalesce(sum(t.amount_idr), 0) as gross,
              coalesce(sum(t.net_idr), 0) as net
         from published_designs p
         join template_purchases t
           on t.published_id = p.id and t.status = 'paid'
        where p.account_id = $1
        group by p.id
        order by gross desc`,
      [accountId],
    ),

    // The buyer by the name they chose, and nothing more. A seller is entitled
    // to know a sale happened; handing them the address of everybody who bought
    // from them is a mailing list nobody agreed to be on.
    query<{
      id: string;
      slug: string;
      title: string;
      amount_idr: number;
      net_idr: number;
      buyer: string | null;
      paid_at: Date;
    }>(
      `select t.id, p.slug, p.title, t.amount_idr, t.net_idr,
              u.display_name as buyer, t.paid_at
         from template_purchases t
         join published_designs p on p.id = t.published_id
         left join user_profiles u on u.id = t.buyer_owner_id
        where t.seller_account_id = $1 and t.status = 'paid'
        order by t.paid_at desc
        limit $2`,
      [accountId, recentLimit],
    ),

    query<{
      id: string;
      period: Date;
      amount_idr: number;
      status: PayoutStatus;
      scheduled_for: Date;
      paid_at: Date | null;
      failure_reason: string | null;
    }>(
      `select id, period, amount_idr, status, scheduled_for, paid_at, failure_reason
         from creator_payouts
        where account_id = $1
        order by period desc`,
      [accountId],
    ),
  ]);

  const months: MonthlyRevenue[] = monthly.map((row) => ({
    month: row.month,
    grossIdr: Number(row.gross),
    netIdr: Number(row.net),
    sold: Number(row.sold),
  }));

  const payoutRecords: PayoutRecord[] = payouts.map((row) => ({
    id: row.id,
    period: isoDate(row.period),
    amountIdr: row.amount_idr,
    status: row.status,
    scheduledFor: isoDate(row.scheduled_for),
    paidAt: row.paid_at?.toISOString() ?? null,
    failureReason: row.failure_reason,
  }));

  // A failed payout is still money owed. It is the transfer that failed, not the
  // sale, and a dashboard that drops it the moment it goes wrong is a dashboard
  // that quietly forgets the one payout somebody needs to ask about.
  const pendingPayoutIdr = payoutRecords
    .filter((payout) => payout.status !== "dibayar")
    .reduce((total, payout) => total + payout.amountIdr, 0);

  const totalsRow = totals[0];

  return {
    summary: {
      grossIdr: Number(totalsRow.gross),
      netIdr: Number(totalsRow.net),
      sold: Number(totalsRow.sold),
      thisMonthIdr: months[months.length - 1]?.grossIdr ?? 0,
      lastMonthIdr: months[months.length - 2]?.grossIdr ?? 0,
      pendingPayoutIdr,
      unscheduledIdr: Number(unscheduled[0].net),
    },
    monthly: months,
    templates: templates.map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      priceIdr: row.price_idr,
      sold: Number(row.sold),
      grossIdr: Number(row.gross),
      netIdr: Number(row.net),
    })),
    recent: recent.map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      amountIdr: row.amount_idr,
      netIdr: row.net_idr,
      // Somebody who never set a name is "Pembeli", not a blank cell and not
      // their email address.
      buyer: row.buyer?.trim() || "Pembeli",
      paidAt: row.paid_at.toISOString(),
    })),
    payouts: payoutRecords,
  };
}

/** A `date` column as `YYYY-MM-DD`, without a timezone it never had. */
function isoDate(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

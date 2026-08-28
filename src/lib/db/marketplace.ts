import "server-only";

import { query } from "@/lib/db/client";

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

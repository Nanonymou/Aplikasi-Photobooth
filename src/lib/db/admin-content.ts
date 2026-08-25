import "server-only";

import { query, transaction } from "@/lib/db/client";

/**
 * The stockroom side of the decoration library.
 *
 * `library.ts` answers what the editor may show: published rows, one kind at a
 * time, in curated order. The console asks the opposite question — everything
 * that exists, drafts included, across all four kinds at once — because an admin
 * curating the pustaka is looking for the thing they half-finished last week,
 * not for a tidy shop window.
 *
 * The four libraries are separate tables on purpose: a template carries slots, a
 * sticker carries a glyph, a text style carries a font. What they share is
 * exactly what this screen shows — a name, a category, whether it is live, and
 * when it last changed — so the union is built over that shared spine and each
 * table keeps its own shape underneath.
 */

/** The console's vocabulary. `text_style` is `textstyle` here, as the UI spells it. */
export type ContentType = "template" | "sticker" | "background" | "textstyle";

export const CONTENT_TYPES: ContentType[] = [
  "template",
  "sticker",
  "background",
  "textstyle",
];

export type ContentStatus = "published" | "draft";

/**
 * Which table each kind lives in.
 *
 * Interpolated into SQL, never a parameter — Postgres does not take table names
 * as parameters. Safe because a caller can only reach it through `ContentType`,
 * and every entry point validates against `CONTENT_TYPES` before getting here.
 */
const TABLES: Record<ContentType, string> = {
  template: "design_templates",
  sticker: "stickers",
  background: "backgrounds",
  textstyle: "text_styles",
};

export function isContentType(value: unknown): value is ContentType {
  return CONTENT_TYPES.includes(value as ContentType);
}

/**
 * The spine the four libraries share, as one relation.
 *
 * The kind is a literal per branch rather than a column, which is what lets
 * Postgres drop the other three tables from the plan entirely when the query
 * filters by type — a filtered tab reads one table, not four.
 */
const UNION = CONTENT_TYPES.map(
  (type) => `select id, '${type}'::text as type, slug, label, category_id,
                    is_premium, published_at, updated_at
               from ${TABLES[type]}`,
).join("\n      union all\n      ");

export interface ContentItem {
  id: string;
  type: ContentType;
  slug: string;
  name: string;
  category: string;
  categorySlug: string;
  status: ContentStatus;
  premium: boolean;
  /** ISO 8601 — the client decides whether that reads as "5 menit lalu" or a date. */
  updatedAt: string;
}

interface ContentRow {
  id: string;
  type: ContentType;
  slug: string;
  label: string;
  category: string;
  category_slug: string;
  is_premium: boolean;
  published_at: Date | null;
  updated_at: Date;
}

function toItem(row: ContentRow): ContentItem {
  return {
    id: row.id,
    type: row.type,
    slug: row.slug,
    name: row.label,
    category: row.category,
    categorySlug: row.category_slug,
    status: row.published_at ? "published" : "draft",
    premium: row.is_premium,
    updatedAt: row.updated_at.toISOString(),
  };
}

export interface ContentQuery {
  search?: string;
  type?: ContentType;
  status?: ContentStatus;
  limit: number;
  offset: number;
}

export interface ContentPage {
  items: ContentItem[];
  total: number;
}

/**
 * One page of the library, newest change first.
 *
 * Ordered by `updated_at` rather than by the curated `position` each table
 * carries: position is how the *editor* should show things, and mixing four
 * tables' positions together would order by nothing in particular. What an admin
 * wants at the top is what moved most recently.
 *
 * Search covers the name and the category label. Keywords are deliberately left
 * out — they are search terms for shoppers, and matching them here would make a
 * sticker surface under a word that appears nowhere on its card, which reads as
 * a bug.
 */
export async function listContent(params: ContentQuery): Promise<ContentPage> {
  const search = params.search?.trim() ?? "";

  const rows = await query<ContentRow & { total: string }>(
    `with items as (
      ${UNION}
    )
    select i.id, i.type, i.slug, i.label, i.is_premium, i.published_at, i.updated_at,
           c.label as category, c.slug as category_slug,
           count(*) over () as total
      from items i
      join library_categories c on c.id = i.category_id
     where ($1::text is null or i.type = $1)
       and ($2::text is null or (i.published_at is not null) = ($2 = 'published'))
       and ($3 = '' or i.label ilike '%' || $3 || '%' or c.label ilike '%' || $3 || '%')
     order by i.updated_at desc, i.id
     limit $4 offset $5`,
    [
      params.type ?? null,
      params.status ?? null,
      search,
      params.limit,
      params.offset,
    ],
  );

  return {
    items: rows.map(toItem),
    // `count(*) over ()` is absent when nothing matched, which is itself zero.
    total: rows[0] ? Number(rows[0].total) : 0,
  };
}

export interface ContentTally {
  total: number;
  published: number;
  draft: number;
}

/**
 * How much of each kind exists, live and in draft.
 *
 * A separate round-trip from the page above because it counts the *whole*
 * library, not the current filter: the summary strip has to keep saying "24
 * latar" while the grid is showing three of them.
 */
export async function countContent(): Promise<Record<ContentType, ContentTally>> {
  const rows = await query<{
    type: ContentType;
    total: string;
    published: string;
  }>(
    `with items as (
      ${UNION}
    )
    select type, count(*) as total, count(published_at) as published
      from items
     group by type`,
  );

  const counts = Object.fromEntries(
    CONTENT_TYPES.map((type) => [type, { total: 0, published: 0, draft: 0 }]),
  ) as Record<ContentType, ContentTally>;

  for (const row of rows) {
    const total = Number(row.total);
    const published = Number(row.published);
    counts[row.type] = { total, published, draft: total - published };
  }

  return counts;
}

/** One item, by kind and id. Null when the id names nothing of that kind. */
export async function getContent(
  type: ContentType,
  id: string,
): Promise<ContentItem | null> {
  const rows = await query<ContentRow>(
    `select i.id, '${type}'::text as type, i.slug, i.label, i.is_premium,
            i.published_at, i.updated_at,
            c.label as category, c.slug as category_slug
       from ${TABLES[type]} i
       join library_categories c on c.id = i.category_id
      where i.id = $1`,
    [id],
  );

  return rows[0] ? toItem(rows[0]) : null;
}

/**
 * Publishes an item or pulls it back to draft.
 *
 * `published_at` is a timestamp, not a flag, so publishing an already-published
 * item must not restamp it: "live since" is information the console shows, and
 * an accidental double-click would otherwise rewrite history. Unpublishing does
 * clear it — a draft has no publication date, and republishing later is a new
 * event, not a resumption of the old one.
 */
export async function setContentStatus(
  type: ContentType,
  id: string,
  status: ContentStatus,
): Promise<ContentItem | null> {
  const rows = await query<{ id: string }>(
    `update ${TABLES[type]}
        set published_at = case when $2 then coalesce(published_at, now()) else null end
      where id = $1
     returning id`,
    [id, status === "published"],
  );

  // The read is a second round-trip because the card the console redraws needs
  // the category label, which lives in another table; RETURNING cannot join.
  return rows[0] ? getContent(type, id) : null;
}

/**
 * Removes an item from the library.
 *
 * Nothing references these rows — a page records the template it came from by
 * slug, as text, precisely so a design outlives the template it was built from.
 * Deleting is therefore a real delete rather than a soft one; what protects
 * against a mistake is that the console asks first.
 *
 * Returns the item as it was, so the console can name what it just removed
 * without having held it in memory.
 */
export async function deleteContent(
  type: ContentType,
  id: string,
): Promise<ContentItem | null> {
  return transaction(async (client) => {
    const { rows } = await client.query<ContentRow>(
      `select i.id, '${type}'::text as type, i.slug, i.label, i.is_premium,
              i.published_at, i.updated_at,
              c.label as category, c.slug as category_slug
         from ${TABLES[type]} i
         join library_categories c on c.id = i.category_id
        where i.id = $1
          for update of i`,
      [id],
    );

    if (!rows[0]) return null;

    await client.query(`delete from ${TABLES[type]} where id = $1`, [id]);
    return toItem(rows[0]);
  });
}

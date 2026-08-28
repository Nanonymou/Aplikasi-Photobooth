import "server-only";

import { query, transaction } from "@/lib/db/client";

/**
 * The public showcase, read and written.
 *
 * `published_designs` (migration 0034) is the wall's source. Everything here
 * reads only live publications unless it says otherwise — a withdrawn design is
 * still addressable so a link somebody sent last week can explain itself, but it
 * is not on the wall.
 */

export const SHOWCASE_CATEGORIES = [
  "pernikahan",
  "wisuda",
  "ulang-tahun",
  "hari-raya",
  "komunitas",
] as const;

export type ShowcaseCategory = (typeof SHOWCASE_CATEGORIES)[number];

export interface ShowcaseItem {
  id: string;
  slug: string;
  designId: string;
  title: string;
  author: string;
  category: ShowcaseCategory;
  tags: string[];
  width: number;
  height: number;
  likes: number;
  remixes: number;
  /** Whether the caller has liked it. Null when nobody is identified. */
  liked: boolean | null;
  publishedAt: string;
  remixOf: { id: string; slug: string; title: string; author: string } | null;
}

interface ItemRow {
  id: string;
  slug: string;
  design_id: string;
  title: string;
  author_name: string;
  category: ShowcaseCategory;
  tags: string[];
  width: number;
  height: number;
  likes: string;
  remixes: string;
  liked: boolean | null;
  published_at: Date;
  source_id: string | null;
  source_slug: string | null;
  source_title: string | null;
  source_author: string | null;
}

function toItem(row: ItemRow): ShowcaseItem {
  return {
    id: row.id,
    slug: row.slug,
    designId: row.design_id,
    title: row.title,
    author: row.author_name,
    category: row.category,
    tags: row.tags,
    width: row.width,
    height: row.height,
    likes: Number(row.likes),
    remixes: Number(row.remixes),
    liked: row.liked,
    publishedAt: row.published_at.toISOString(),
    remixOf:
      row.source_id && row.source_slug && row.source_title && row.source_author
        ? {
            id: row.source_id,
            slug: row.source_slug,
            title: row.source_title,
            author: row.source_author,
          }
        : null,
  };
}

/**
 * The columns every showcase read needs, counted rather than stored.
 *
 * Lateral subqueries rather than joins with a group by: the wall reads twelve
 * rows at a time, both counts are index lookups, and keeping them out of the
 * grouping means the ordering and the filters stay readable.
 */
const ITEM_SELECT = `
  p.id, p.slug, p.design_id, p.title, p.author_name, p.category, p.tags,
  p.width, p.height, p.published_at,
  (select count(*) from design_likes l where l.published_id = p.id) as likes,
  (select count(*) from designs d where d.remix_of_id = p.id) as remixes,
  case when $1::uuid is null then null else exists (
    select 1 from design_likes l
     where l.published_id = p.id and l.owner_id = $1::uuid
  ) end as liked,
  o.id as source_id, o.slug as source_slug,
  o.title as source_title, o.author_name as source_author
`;

const ITEM_FROM = `
  from published_designs p
  left join published_designs o on o.id = p.remix_of_id
`;

export interface ShowcaseQuery {
  category?: ShowcaseCategory | null;
  /** `terbaru`, `populer`, or `remix`. */
  sort?: "terbaru" | "populer" | "remix";
  search?: string | null;
  limit?: number;
  offset?: number;
  /** Who is asking, so each card can say whether they have liked it. */
  viewer?: string | null;
}

export interface ShowcasePage {
  items: ShowcaseItem[];
  /** Everything matching the filter, not just this page. */
  total: number;
  /** How many sit in each category under the current search. */
  counts: Record<ShowcaseCategory, number>;
}

/**
 * The wall, filtered, ordered, and counted.
 *
 * The counts ignore the chosen category but respect the search, which is the
 * only combination that makes the chips useful: they have to say how many are
 * behind each of the *other* chips, or tapping one lands on an empty wall with
 * no way to have known.
 *
 * `total` is derived from those same counts rather than from the rows, and that
 * is not a shortcut: a window count only sees the rows it returns, so paging one
 * step past the end would report a collection of zero and flip the "6 karya"
 * above the wall to "0 karya" on the last page. The counts already answer the
 * question exactly, for one category or for all of them, whatever the offset.
 */
export async function listShowcase(
  params: ShowcaseQuery = {},
): Promise<ShowcasePage> {
  const order =
    params.sort === "terbaru"
      ? "p.published_at desc"
      : params.sort === "remix"
        ? "remixes desc, p.published_at desc"
        : "likes desc, p.published_at desc";

  const search = params.search?.trim() ?? "";

  const [rows, counts] = await Promise.all([
    query<ItemRow>(
      `select ${ITEM_SELECT}
       ${ITEM_FROM}
        where p.unpublished_at is null
          and ($2::text is null or p.category = $2)
          and ($3 = '' or p.title ilike '%' || $3 || '%' or $3 = any(p.tags))
        order by ${order}
        limit $4 offset $5`,
      [
        params.viewer ?? null,
        params.category ?? null,
        search,
        params.limit ?? 60,
        params.offset ?? 0,
      ],
    ),
    query<{ category: ShowcaseCategory; count: string }>(
      `select p.category, count(*) as count
         from published_designs p
        where p.unpublished_at is null
          and ($1 = '' or p.title ilike '%' || $1 || '%' or $1 = any(p.tags))
        group by p.category`,
      [search],
    ),
  ]);

  const byCategory = Object.fromEntries(
    SHOWCASE_CATEGORIES.map((category) => [category, 0]),
  ) as Record<ShowcaseCategory, number>;
  for (const row of counts) byCategory[row.category] = Number(row.count);

  return {
    items: rows.map(toItem),
    total: params.category
      ? byCategory[params.category]
      : Object.values(byCategory).reduce((sum, count) => sum + count, 0),
    counts: byCategory,
  };
}

/**
 * One publication by slug, withdrawn ones included.
 *
 * A withdrawn design still answers, because the alternative is a 404 for
 * everybody holding a link that used to work — and "the maker took this down" is
 * a better answer than "this never existed". The caller decides what to show.
 */
export async function getShowcaseItem(
  slug: string,
  viewer?: string | null,
): Promise<(ShowcaseItem & { withdrawn: boolean }) | null> {
  const rows = await query<ItemRow & { unpublished_at: Date | null }>(
    `select ${ITEM_SELECT}, p.unpublished_at
     ${ITEM_FROM}
      where p.slug = $2`,
    [viewer ?? null, slug],
  );

  const row = rows[0];
  return row
    ? { ...toItem(row), withdrawn: row.unpublished_at !== null }
    : null;
}

export interface PublishInput {
  designId: string;
  /**
   * Every identity the caller holds — their account plus the guest sessions it
   * has claimed. A design made in the browser before signing in is owned by the
   * guest owner id, not by the account, and checking only the account would tell
   * people their own work is not theirs.
   */
  owners: string[];
  /** The account the publication is filed under. */
  accountId: string;
  authorName: string;
  title: string;
  category: ShowcaseCategory;
  tags: string[];
  width: number;
  height: number;
  /** The publication this design was started from, if any. */
  remixOfId?: string | null;
}

export type PublishResult =
  | { ok: true; item: ShowcaseItem }
  | { ok: false; reason: "not-your-design" | "slug-taken" };

/** A slug from a title, with a short suffix so two "Kartu ucapan" can coexist. */
function slugify(title: string): string {
  const base =
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 48) || "desain";

  return `${base}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Publishes a design, or updates the publication it already has.
 *
 * The design has to be the caller's — publishing somebody else's work under your
 * own name is the one thing a showcase must never let happen, and it is checked
 * here rather than trusted from the request.
 *
 * Re-publishing edits the existing row rather than making a second card. The
 * slug is minted once and never changes: it is the address people have already
 * sent each other, and a title edit must not break it.
 */
export async function publishDesign(
  input: PublishInput,
): Promise<PublishResult> {
  return transaction(async (client) => {
    const { rows: owned } = await client.query<{ id: string }>(
      `select id from designs
        where id = $1 and owner_id = any($2::uuid[]) and deleted_at is null`,
      [input.designId, input.owners],
    );
    if (owned.length === 0) return { ok: false, reason: "not-your-design" };

    const { rows: existing } = await client.query<{ id: string }>(
      "select id from published_designs where design_id = $1",
      [input.designId],
    );

    if (existing.length > 0) {
      await client.query(
        `update published_designs
            set title = $2, author_name = $3, category = $4, tags = $5,
                width = $6, height = $7,
                -- Re-publishing something withdrawn puts it back on the wall.
                unpublished_at = null
          where id = $1`,
        [
          existing[0].id,
          input.title.trim(),
          input.authorName.trim(),
          input.category,
          input.tags,
          input.width,
          input.height,
        ],
      );
    } else {
      await client.query(
        `insert into published_designs
           (design_id, account_id, slug, title, author_name, category, tags,
            width, height, remix_of_id)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          input.designId,
          input.accountId,
          slugify(input.title),
          input.title.trim(),
          input.authorName.trim(),
          input.category,
          input.tags,
          input.width,
          input.height,
          input.remixOfId ?? null,
        ],
      );
    }

    const { rows } = await client.query<ItemRow>(
      `select ${ITEM_SELECT} ${ITEM_FROM} where p.design_id = $2`,
      [input.accountId, input.designId],
    );

    return { ok: true, item: toItem(rows[0]) };
  });
}

/**
 * Takes a design off the wall.
 *
 * A timestamp, not a delete. The link keeps working and says what happened, the
 * likes it collected are still counted if it goes back up, and every remix that
 * credits it keeps its credit.
 */
export async function withdrawDesign(
  accountId: string,
  slug: string,
): Promise<boolean> {
  const rows = await query<{ id: string }>(
    `update published_designs
        set unpublished_at = now()
      where slug = $1 and account_id = $2 and unpublished_at is null
     returning id`,
    [slug, accountId],
  );
  return rows.length > 0;
}

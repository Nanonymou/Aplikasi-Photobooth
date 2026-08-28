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
  /** Whether the caller has saved it. Private to them, unlike the like count. */
  saved: boolean | null;
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
  saved: boolean | null;
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
    saved: row.saved,
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
  case when $1::uuid is null then null else exists (
    select 1 from design_saves v
     where v.published_id = p.id and v.owner_id = $1::uuid
  ) end as saved,
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
    const { rows: owned } = await client.query<{
      id: string;
      remix_of_id: string | null;
    }>(
      `select id, remix_of_id from designs
        where id = $1 and owner_id = any($2::uuid[]) and deleted_at is null`,
      [input.designId, input.owners],
    );
    if (owned.length === 0) return { ok: false, reason: "not-your-design" };

    // The credit is the design's, not something the publisher types in. Reading
    // it here is what carries "remix dari X" from the editor onto the wall — and
    // taking it from the request instead would let anybody claim to have
    // remixed anything, or drop a credit they would rather not mention.
    const remixOfId = owned[0].remix_of_id;

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
          remixOfId,
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

export type Reaction = "like" | "save";

const REACTION_TABLE: Record<Reaction, string> = {
  like: "design_likes",
  save: "design_saves",
};

export interface ReactionResult {
  /** Whether it is on after this call. */
  on: boolean;
  /** The public like count, which a save never changes. */
  likes: number;
}

/**
 * Turns a like or a save on, or off again.
 *
 * A toggle rather than separate add and remove verbs: the button is one button,
 * pressed twice by somebody who changed their mind, and two endpoints would need
 * the client to know which one it currently is — which is exactly the thing it
 * asked the server about a moment ago and may already be wrong about.
 *
 * `on conflict do nothing` and a delete that matches nothing are both fine
 * answers. A double-tap on a slow connection sends two identical requests, and
 * neither should be an error.
 *
 * Withdrawn designs still accept both. Somebody's saved shortlist should not
 * quietly refuse to let them tidy it up because the maker took a design down.
 */
export async function toggleReaction(
  kind: Reaction,
  slug: string,
  ownerId: string,
  on: boolean,
): Promise<ReactionResult | null> {
  return transaction(async (client) => {
    const { rows: found } = await client.query<{ id: string }>(
      "select id from published_designs where slug = $1",
      [slug],
    );
    const published = found[0];
    if (!published) return null;

    const table = REACTION_TABLE[kind];

    if (on) {
      await client.query(
        `insert into ${table} (published_id, owner_id) values ($1, $2)
         on conflict do nothing`,
        [published.id, ownerId],
      );
    } else {
      await client.query(
        `delete from ${table} where published_id = $1 and owner_id = $2`,
        [published.id, ownerId],
      );
    }

    const { rows: counted } = await client.query<{ likes: string }>(
      "select count(*) as likes from design_likes where published_id = $1",
      [published.id],
    );

    return { on, likes: Number(counted[0].likes) };
  });
}

/** The slugs this visitor has saved, newest first — their shortlist. */
export async function listSaved(
  ownerId: string,
  viewer?: string | null,
  limit = 60,
): Promise<ShowcaseItem[]> {
  const rows = await query<ItemRow>(
    `select ${ITEM_SELECT}
     ${ITEM_FROM}
     join design_saves v on v.published_id = p.id and v.owner_id = $2
      where p.unpublished_at is null
      order by v.created_at desc
      limit $3`,
    [viewer ?? ownerId, ownerId, limit],
  );

  return rows.map(toItem);
}

export interface RemixResult {
  designId: string;
  title: string;
  /** What it was started from, for the credit the editor shows. */
  source: { slug: string; title: string; author: string };
}

export type RemixOutcome =
  | { ok: true; remix: RemixResult }
  | { ok: false; reason: "not-found" | "unlicensed"; price?: number };

/**
 * Starts a new design from a published one.
 *
 * The copy is made inside the database, like `duplicateDesign`: a design is
 * megabytes of inline photos, and shipping them out to the browser only to have
 * them posted straight back is the most expensive possible way to say "again".
 *
 * The photos come with it, and that is deliberate rather than an oversight. A
 * template published to the showcase *is* its example photos — a strip with
 * three empty grey rectangles teaches nobody what it looks like — and the
 * remixer replaces them as their first act. What does not come with it is
 * anything about who owns it: the copy belongs to the remixer from the moment it
 * exists.
 *
 * A withdrawn design still remixes. Somebody following a link from a friend who
 * made one last week should not be told no because the original maker has since
 * tidied their gallery; the credit simply names a design that is no longer on
 * the wall.
 *
 * A priced one only remixes for somebody who has paid for it, or who made it.
 * The licence is checked against every identity the caller holds, in the same
 * statement that reads the source — a second query would leave a window between
 * "you may" and "here it is".
 */
export async function remixDesign(
  ownerId: string,
  slug: string,
  owners: string[] = [ownerId],
): Promise<RemixOutcome> {
  return transaction(async (client) => {
    const { rows: found } = await client.query<{
      id: string;
      design_id: string;
      title: string;
      author_name: string;
      slug: string;
      price_idr: number;
      account_id: string;
      licensed: boolean;
    }>(
      `select id, design_id, title, author_name, slug, price_idr, account_id,
              price_idr = 0
                or account_id = any($2::uuid[])
                or exists (
                     select 1 from template_purchases t
                      where t.published_id = published_designs.id
                        and t.status = 'paid'
                        and t.buyer_owner_id = any($2::uuid[])
                   ) as licensed
         from published_designs where slug = $1`,
      [slug, owners],
    );
    const source = found[0];
    if (!source) return { ok: false, reason: "not-found" };

    // Where the licence is enforced, rather than only described. A paid template
    // is a thing somebody sells; remixing is the whole of what they sell, so a
    // remix nobody paid for is the sale not happening.
    if (!source.licensed) {
      return { ok: false, reason: "unlicensed", price: source.price_idr };
    }

    // The design behind the publication may be gone — publications cascade on
    // delete, so in practice this means a race with a deletion.
    const { rows: created } = await client.query<{ id: string }>(
      `insert into designs (owner_id, title, remix_of_id)
       select $1, $3, $4 from designs where id = $2 and deleted_at is null
       returning id`,
      [ownerId, source.design_id, `${source.title} (remix)`, source.id],
    );
    const copy = created[0];
    if (!copy) return { ok: false, reason: "not-found" };

    await client.query(
      `insert into design_pages
         (design_id, id, position, name, template_id, width, height,
          background_type, background, objects, effects)
       select $2, id, position, name, template_id, width, height,
              background_type, background, objects, effects
         from design_pages
        where design_id = $1`,
      [source.design_id, copy.id],
    );

    return {
      ok: true,
      remix: {
        designId: copy.id,
        title: `${source.title} (remix)`,
        source: {
          slug: source.slug,
          title: source.title,
          author: source.author_name,
        },
      },
    };
  });
}

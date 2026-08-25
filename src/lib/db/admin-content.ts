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
export type ContentType =
  | "template"
  | "sticker"
  | "background"
  | "textstyle"
  | "filter"
  | "effect";

export const CONTENT_TYPES: ContentType[] = [
  "template",
  "sticker",
  "background",
  "textstyle",
  "filter",
  "effect",
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
  filter: "photo_filters",
  effect: "visual_effects",
};

/**
 * Where each library keeps the category a row belongs to.
 *
 * Four of them point at `library_categories`, which is a curated, growable list
 * with its own labels and ordering. Filters and effects instead carry an enum,
 * because their families are a decision about how the panel is laid out rather
 * than a list anyone adds to — see migration 0024. Both answer the same two
 * questions here (what is its slug, what does it read as), so the difference
 * lives in this one map instead of in every query.
 */
const CATEGORY_SOURCE: Record<ContentType, "table" | "enum"> = {
  template: "table",
  sticker: "table",
  background: "table",
  textstyle: "table",
  filter: "enum",
  effect: "enum",
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
function categorySelect(type: ContentType): string {
  return CATEGORY_SOURCE[type] === "table"
    ? `c.slug as category_slug, c.label as category`
    : // `initcap` turns `monokrom` into `Monokrom`, which is exactly how the
      // panel already labels these families — no second list to keep in step.
      `i.category::text as category_slug, initcap(i.category::text) as category`;
}

function categoryJoin(type: ContentType): string {
  return CATEGORY_SOURCE[type] === "table"
    ? "join library_categories c on c.id = i.category_id"
    : "";
}

const UNION = CONTENT_TYPES.map(
  (type) => `select i.id, '${type}'::text as type, i.slug, i.label,
                    ${categorySelect(type)},
                    i.is_premium, i.published_at, i.updated_at
               from ${TABLES[type]} i
               ${categoryJoin(type)}`,
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
           i.category, i.category_slug,
           count(*) over () as total
      from items i
     where ($1::text is null or i.type = $1)
       and ($2::text is null or (i.published_at is not null) = ($2 = 'published'))
       and ($3 = '' or i.label ilike '%' || $3 || '%' or i.category ilike '%' || $3 || '%')
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
            ${categorySelect(type)}
       from ${TABLES[type]} i
       ${categoryJoin(type)}
      where i.id = $1`,
    [id],
  );

  return rows[0] ? toItem(rows[0]) : null;
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
              ${categorySelect(type)}
         from ${TABLES[type]} i
         ${categoryJoin(type)}
        where i.id = $1
          for update of i`,
      [id],
    );

    if (!rows[0]) return null;

    await client.query(`delete from ${TABLES[type]} where id = $1`, [id]);
    return toItem(rows[0]);
  });
}

export interface AssetUpload {
  /** Only the two libraries that are made of uploaded artwork. */
  type: Extract<ContentType, "sticker" | "background">;
  label: string;
  categorySlug: string;
  /** `<sha256>.<ext>` in photo storage — the bytes are already there. */
  storageKey: string;
  width: number;
  height: number;
  premium: boolean;
  /** Published straight away, or parked as a draft for review. */
  publish: boolean;
}

export class UnknownCategoryError extends Error {
  constructor(slug: string) {
    super(`Kategori "${slug}" tidak ada untuk jenis ini.`);
    this.name = "UnknownCategoryError";
  }
}

export class FixedCategoryError extends Error {
  constructor(type: ContentType) {
    super(
      `Kategori ${type} tidak bisa diubah: keluarganya ditentukan panel, bukan data.`,
    );
    this.name = "FixedCategoryError";
  }
}

export class DuplicateSlugError extends Error {
  constructor(slug: string) {
    super(`Slug "${slug}" sudah dipakai.`);
    this.name = "DuplicateSlugError";
  }
}

/**
 * A url-safe name derived from the label.
 *
 * The slug is what a page records when it uses something, so it outlives the
 * row's uuid and has to be readable — `bunga-musim-semi`, not a hash. Derived
 * rather than asked for, because nobody uploading a sticker wants to be asked
 * for two names.
 */
export function slugify(label: string): string {
  return label
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * Adds an uploaded asset to the library.
 *
 * Only stickers and backgrounds. A template is a composition — slots, texts, a
 * canvas size — and a text style is a set of font fields; neither is a file
 * somebody uploads, and pretending otherwise would mean one endpoint that
 * half-understands four different shapes.
 *
 * The bytes are stored before this is called and identified by their own hash,
 * so uploading the same artwork twice is one file with two rows pointing at it.
 * The slug is what must be unique, and a clash is reported rather than silently
 * suffixed: two stickers called the same thing is a decision for the person
 * naming them.
 */
export async function createAsset(input: AssetUpload): Promise<ContentItem> {
  const kind = input.type === "sticker" ? "sticker" : "background";
  const slug = slugify(input.label);

  const [category] = await query<{ id: string }>(
    "select id from library_categories where kind = $1 and slug = $2",
    [kind, input.categorySlug],
  );
  if (!category) throw new UnknownCategoryError(input.categorySlug);

  const published = input.publish ? "now()" : "null";

  try {
    const rows =
      input.type === "sticker"
        ? await query<{ id: string }>(
            `insert into stickers
               (slug, label, category_id, kind, storage_key, width, height,
                is_premium, published_at)
             values ($1, $2, $3, 'image', $4, $5, $6, $7, ${published})
             returning id`,
            [
              slug,
              input.label.trim(),
              category.id,
              input.storageKey,
              input.width,
              input.height,
              input.premium,
            ],
          )
        : await query<{ id: string }>(
            `insert into backgrounds
               (slug, label, category_id, background_type, background, is_premium, published_at)
             values ($1, $2, $3, 'image', $4::jsonb, $5, ${published})
             returning id`,
            [
              slug,
              input.label.trim(),
              category.id,
              JSON.stringify({
                type: "image",
                src: `/api/photos/${input.storageKey}`,
              }),
              input.premium,
            ],
          );

    const created = await getContent(input.type, rows[0].id);
    if (!created) throw new Error("Aset baru tidak terbaca setelah dibuat.");
    return created;
  } catch (error) {
    // 23505 is a unique violation, and `slug` is the only unique column here.
    if (
      typeof error === "object" &&
      error !== null &&
      (error as { code?: string }).code === "23505"
    ) {
      throw new DuplicateSlugError(slug);
    }
    throw error;
  }
}

export interface ContentEdit {
  label?: string;
  categorySlug?: string;
  status?: ContentStatus;
}

/**
 * Edits what an item is called, where it files, and whether it is live.
 *
 * Not its artwork. Replacing the bytes behind an asset would silently change
 * every design already using it — the library's whole contract is that a slug
 * means one thing forever — so a new picture is a new asset, and the old one is
 * unpublished if nobody should reach it any more.
 *
 * The slug is deliberately left alone by a rename. It is the name pages recorded
 * when they used this, and rewriting it would orphan them; the label is what
 * anybody actually reads.
 */
export async function editContent(
  type: ContentType,
  id: string,
  edit: ContentEdit,
): Promise<ContentItem | null> {
  let categoryId: string | null = null;

  if (edit.categorySlug !== undefined) {
    if (CATEGORY_SOURCE[type] === "enum") {
      // Moving a filter between families would change what the panel offers
      // under a tab, which is a code change, not an edit.
      throw new FixedCategoryError(type);
    }

    const kind = type === "textstyle" ? "text_style" : type;
    const [category] = await query<{ id: string }>(
      "select id from library_categories where kind = $1 and slug = $2",
      [kind, edit.categorySlug],
    );
    if (!category) throw new UnknownCategoryError(edit.categorySlug);
    categoryId = category.id;
  }

  /*
   * The SET list is built rather than written out, because filters and effects
   * have no `category_id` column at all — naming one is a syntax error, not a
   * no-op. Parameters are numbered as they are pushed for the same reason: a
   * placeholder that survives while its clause does not leaves Postgres unable
   * to infer its type.
   */
  const values: unknown[] = [id, edit.label?.trim() ?? null];
  let categoryClause = "";

  if (CATEGORY_SOURCE[type] === "table") {
    values.push(categoryId);
    categoryClause = `category_id = coalesce($${values.length}::uuid, category_id),`;
  }

  values.push(edit.status === undefined ? null : edit.status === "published");
  const status = `$${values.length}`;

  const rows = await query<{ id: string }>(
    `update ${TABLES[type]}
        set label = coalesce($2, label),
            ${categoryClause}
            published_at = case
              when ${status}::boolean is null then published_at
              when ${status} then coalesce(published_at, now())
              else null
            end
      where id = $1
     returning id`,
    values,
  );

  return rows[0] ? getContent(type, id) : null;
}

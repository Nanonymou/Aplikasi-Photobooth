import "server-only";

import { query } from "@/lib/db/client";
import type { PageBackground } from "@/types/editor";

/**
 * Reads over the decoration library.
 *
 * Every list here answers the same question in a different vocabulary: "what
 * may this user see in this category, matching this search, in curated order".
 * Drafts (`published_at is null`) never appear — the editor sees the shop
 * window, the admin dashboard will see the stockroom.
 */

export type LibraryKind = "template" | "sticker" | "background" | "text_style";

export interface LibraryCategory {
  slug: string;
  label: string;
  /** How many published items sit in it; the panel shows this next to the tab. */
  count: number;
}

export interface LibraryQuery {
  /** Category slug, or `all`/undefined for everything. */
  category?: string;
  /** Free text matched against label and keywords. */
  search?: string;
  limit?: number;
  offset?: number;
}

export const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 60;

interface Bounds {
  limit: number;
  offset: number;
}

/** Keeps a hand-written query string from asking for the whole table. */
export function bounds({ limit, offset }: LibraryQuery): Bounds {
  return {
    limit: Math.min(MAX_LIMIT, Math.max(1, Math.trunc(limit ?? DEFAULT_LIMIT))),
    offset: Math.max(0, Math.trunc(offset ?? 0)),
  };
}

/** Categories that actually have something published in them. */
export async function listCategories(
  kind: LibraryKind,
  table: "design_templates" | "stickers" | "backgrounds" | "text_styles",
): Promise<LibraryCategory[]> {
  // The table name is not user input — callers pass a literal from the union
  // above — so interpolating it is safe where a parameter would not be allowed.
  const rows = await query<{ slug: string; label: string; count: number }>(
    `select c.slug, c.label, count(i.id)::int as count
       from library_categories c
       left join ${table} i
         on i.category_id = c.id and i.published_at is not null
      where c.kind = $1
      group by c.id, c.slug, c.label, c.position
      order by c.position, c.label`,
    [kind],
  );

  return rows;
}

/**
 * The WHERE every library list shares, with fixed parameter positions:
 * $1 category slug (or null), $2 search text (or null).
 *
 * Written once because the three libraries answer the same question and drift
 * between them would show up as "search works in stickers but not backgrounds".
 * `i` is the item table, `c` its joined category.
 */
const LIBRARY_FILTER = `
  i.published_at is not null
  and ($1::text is null or c.slug = $1)
  and ($2::text is null
       or i.label ilike '%' || $2 || '%'
       or exists (
         select 1 from unnest(i.keywords) as keyword
          where keyword ilike '%' || $2 || '%'
       ))
`;

/** Normalises the free-form filter into the parameters the SQL above expects. */
function filterValues(options: LibraryQuery): [string | null, string | null] {
  return [
    options.category && options.category !== "all" ? options.category : null,
    options.search?.trim() || null,
  ];
}

export interface TemplateSummary {
  /** Slug — what the client has always called a template id. */
  id: string;
  label: string;
  category: string;
  keywords: string[];
  width: number;
  height: number;
  background: PageBackground;
  slotCount: number;
  isPremium: boolean;
}

interface TemplateSummaryRow {
  slug: string;
  label: string;
  category: string;
  keywords: string[];
  width: number;
  height: number;
  background: PageBackground;
  slot_count: number;
  is_premium: boolean;
}

export interface TemplateListing {
  templates: TemplateSummary[];
  /** Total matching the filter, so the client can page or show a count. */
  total: number;
}

/**
 * Templates for the library panel.
 *
 * Summaries only: the composition (slots, texts, stickers) is several kilobytes
 * per template and is not needed until one is opened, which is what the detail
 * endpoint is for.
 */
export async function listTemplates(
  options: LibraryQuery = {},
): Promise<TemplateListing> {
  const { limit, offset } = bounds(options);

  const rows = await query<TemplateSummaryRow & { total: number }>(
    `select i.slug, i.label, c.slug as category, i.keywords, i.width, i.height,
            i.background, jsonb_array_length(i.slots) as slot_count,
            i.is_premium,
            count(*) over ()::int as total
       from design_templates i
       join library_categories c on c.id = i.category_id
      where ${LIBRARY_FILTER}
      order by i.position, i.label
      limit $3 offset $4`,
    [...filterValues(options), limit, offset],
  );

  return {
    templates: rows.map((row) => ({
      id: row.slug,
      label: row.label,
      category: row.category,
      keywords: row.keywords,
      width: row.width,
      height: row.height,
      background: row.background,
      slotCount: row.slot_count,
      isPremium: row.is_premium,
    })),
    // `count(*) over ()` rides along on the same scan; with no rows there is
    // nothing to ride on, and the total is zero by definition.
    total: rows[0]?.total ?? 0,
  };
}

export interface StickerSummary {
  id: string;
  label: string;
  category: string;
  keywords: string[];
  kind: "emoji" | "image";
  /** Set for emoji stickers; the browser draws it directly. */
  glyph: string | null;
  /** Set for image stickers, along with the artwork's intrinsic size. */
  url: string | null;
  width: number | null;
  height: number | null;
  isPremium: boolean;
}

interface StickerRow {
  slug: string;
  label: string;
  category: string;
  keywords: string[];
  kind: "emoji" | "image";
  glyph: string | null;
  storage_key: string | null;
  width: number | null;
  height: number | null;
  is_premium: boolean;
  total: number;
}

export interface StickerListing {
  stickers: StickerSummary[];
  total: number;
}

/**
 * Stickers for the library panel.
 *
 * Unlike templates there is no heavier "detail" to fetch later: a sticker is
 * its glyph or its artwork URL, and both fit in the list.
 */
export async function listStickers(
  options: LibraryQuery = {},
): Promise<StickerListing> {
  const { limit, offset } = bounds(options);

  const rows = await query<StickerRow>(
    `select i.slug, i.label, c.slug as category, i.keywords, i.kind, i.glyph,
            i.storage_key, i.width, i.height, i.is_premium,
            count(*) over ()::int as total
       from stickers i
       join library_categories c on c.id = i.category_id
      where ${LIBRARY_FILTER}
      order by i.position, i.label
      limit $3 offset $4`,
    [...filterValues(options), limit, offset],
  );

  return {
    stickers: rows.map((row) => ({
      id: row.slug,
      label: row.label,
      category: row.category,
      keywords: row.keywords,
      kind: row.kind,
      glyph: row.glyph,
      url: row.storage_key ? `/api/photos/${row.storage_key}` : null,
      width: row.width,
      height: row.height,
      isPremium: row.is_premium,
    })),
    total: rows[0]?.total ?? 0,
  };
}

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
  const category =
    options.category && options.category !== "all" ? options.category : null;
  const search = options.search?.trim() || null;

  const rows = await query<TemplateSummaryRow & { total: number }>(
    `select t.slug, t.label, c.slug as category, t.keywords, t.width, t.height,
            t.background, jsonb_array_length(t.slots) as slot_count,
            t.is_premium,
            count(*) over ()::int as total
       from design_templates t
       join library_categories c on c.id = t.category_id
      where t.published_at is not null
        and ($1::text is null or c.slug = $1)
        and ($2::text is null
             or t.label ilike '%' || $2 || '%'
             or exists (
               select 1 from unnest(t.keywords) as keyword
                where keyword ilike '%' || $2 || '%'
             ))
      order by t.position, t.label
      limit $3 offset $4`,
    [category, search, limit, offset],
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

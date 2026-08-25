import "server-only";

import { query } from "@/lib/db/client";

/**
 * A person's own designs, as their gallery sees them.
 *
 * The card, not the design: title, page count, cover size, whether a link is
 * live, and a hue to tint the thumbnail with. The designs themselves — loading,
 * saving, renaming, deleting — live in `designs.ts`; this is only how they look
 * on a wall.
 *
 * The editor's endpoints scope by the browser's owner id, which is right for
 * the editor: it is the identity that saved the file. A gallery is asked a
 * wider question — "everything I have made" — and the honest answer spans more
 * than one owner id, because an account only becomes the owner of the work it
 * claimed when signing in. Work made afterwards still carries the guest
 * identity, so a gallery scoped to the account alone would go blank the moment
 * someone kept working after logging in.
 */

export interface GalleryDesign {
  id: string;
  title: string;
  updatedAt: string;
  pageCount: number;
  /** Size of the first page, for the card's aspect ratio. */
  width: number | null;
  height: number | null;
  /** True while a live share link points at it. */
  shared: boolean;
  /** A stable hue for the card's thumbnail, so every surface tints it alike. */
  hue: number;
}

interface GalleryRow {
  id: string;
  title: string;
  updated_at: Date;
  page_count: number;
  width: number | null;
  height: number | null;
  shared: boolean;
  total: string;
}

/**
 * A colour derived from the id, not stored.
 *
 * The thumbnail needs a tint and the design has no colour of its own worth
 * reading — the artwork is a page of objects, and rendering one to pick a hue
 * for a list of forty cards is not a trade worth making. Deriving it from the
 * id keeps it stable across reloads and identical on every surface, which is
 * all the card actually needs from it.
 */
export function hueFor(id: string): number {
  let hash = 0;
  for (const character of id) {
    hash = (hash * 31 + character.charCodeAt(0)) % 360;
  }
  return hash;
}

function toDesign(row: GalleryRow): GalleryDesign {
  return {
    id: row.id,
    title: row.title,
    updatedAt: row.updated_at.toISOString(),
    pageCount: row.page_count,
    width: row.width,
    height: row.height,
    shared: row.shared,
    hue: hueFor(row.id),
  };
}

export type GalleryScope = "all" | "shared";
export type GallerySort = "recent" | "name";

export interface GalleryQuery {
  owners: string[];
  search?: string;
  scope?: GalleryScope;
  sort?: GallerySort;
  limit: number;
  offset: number;
}

export interface GalleryPage {
  designs: GalleryDesign[];
  total: number;
  /** How many of the caller's designs have a live link, whatever the filter. */
  sharedCount: number;
}

/**
 * One page of the gallery.
 *
 * `objects` is never selected — a wall of ten cards would otherwise carry every
 * photo inside every design across the wire — and the page count, cover size,
 * and share state each come from a lateral join rather than a round trip per
 * card.
 */
export async function listGallery(params: GalleryQuery): Promise<GalleryPage> {
  if (params.owners.length === 0) {
    return { designs: [], total: 0, sharedCount: 0 };
  }

  const search = params.search?.trim() ?? "";
  const order =
    params.sort === "name" ? "d.title asc, d.id" : "d.updated_at desc, d.id";

  const rows = await query<GalleryRow>(
    `select d.id,
            d.title,
            d.updated_at,
            coalesce(counted.page_count, 0)::int as page_count,
            cover.width,
            cover.height,
            live.shared,
            count(*) over () as total
       from designs d
       left join lateral (
         select count(*)::int as page_count
           from design_pages p
          where p.design_id = d.id
       ) counted on true
       left join lateral (
         select p.width, p.height
           from design_pages p
          where p.design_id = d.id
          order by p.position
          limit 1
       ) cover on true
       cross join lateral (
         select exists (
           select 1 from shares s
            where s.design_id = d.id
              and s.revoked_at is null
              and s.expires_at > now()
         ) as shared
       ) live
      where d.owner_id = any($1::uuid[])
        and d.deleted_at is null
        and ($2 = '' or d.title ilike '%' || $2 || '%')
        and ($3::boolean is not true or live.shared)
      order by ${order}
      limit $4 offset $5`,
    [
      params.owners,
      search,
      params.scope === "shared",
      params.limit,
      params.offset,
    ],
  );

  const [tally] = await query<{ shared: string }>(
    `select count(*) as shared
       from designs d
      where d.owner_id = any($1::uuid[])
        and d.deleted_at is null
        and exists (
          select 1 from shares s
           where s.design_id = d.id
             and s.revoked_at is null
             and s.expires_at > now()
        )`,
    [params.owners],
  );

  return {
    designs: rows.map(toDesign),
    // `count(*) over ()` is absent when nothing matched, which is itself zero.
    total: rows[0] ? Number(rows[0].total) : 0,
    sharedCount: Number(tally?.shared ?? 0),
  };
}

/** One card, by id. Null when the id is not one of the caller's. */
export async function getGalleryDesign(
  owners: string[],
  designId: string,
): Promise<GalleryDesign | null> {
  if (owners.length === 0) return null;

  const rows = await query<GalleryRow>(
    `select d.id,
            d.title,
            d.updated_at,
            coalesce(counted.page_count, 0)::int as page_count,
            cover.width,
            cover.height,
            exists (
              select 1 from shares s
               where s.design_id = d.id
                 and s.revoked_at is null
                 and s.expires_at > now()
            ) as shared,
            '1' as total
       from designs d
       left join lateral (
         select count(*)::int as page_count
           from design_pages p
          where p.design_id = d.id
       ) counted on true
       left join lateral (
         select p.width, p.height
           from design_pages p
          where p.design_id = d.id
          order by p.position
          limit 1
       ) cover on true
      where d.id = $1
        and d.owner_id = any($2::uuid[])
        and d.deleted_at is null`,
    [designId, owners],
  );

  return rows[0] ? toDesign(rows[0]) : null;
}

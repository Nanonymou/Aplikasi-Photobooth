import "server-only";

import { query, transaction } from "@/lib/db/client";
import { getGalleryDesign, type GalleryDesign } from "@/lib/db/gallery";
import { projectToPageWrites, rowsToProject } from "@/lib/db/mappers";
import {
  ensureGuestSession,
  type GuestSession,
} from "@/lib/db/guest-sessions";
import type { DesignPageRow, DesignRow } from "@/lib/db/types";
import type { EditorProject } from "@/types/editor";

/** Raised when a save is based on a version someone else has already replaced. */
export class DesignConflictError extends Error {
  constructor(readonly currentVersion: number) {
    super("Desain sudah diperbarui di tempat lain.");
    this.name = "DesignConflictError";
  }
}

export class DesignNotFoundError extends Error {
  constructor() {
    super("Desain tidak ditemukan.");
    this.name = "DesignNotFoundError";
  }
}

export interface SavedDesign {
  id: string;
  version: number;
  updatedAt: string;
}

/**
 * Whether a string could be a design id at all.
 *
 * `designs.id` is a uuid column, so anything else reaching it makes Postgres
 * raise 22P02 rather than answer "no such row" — and a guessed id that is not
 * even a uuid deserves the same 404 as one that is. Checked here rather than in
 * each route, because three routes had grown three different answers to it: a
 * regex in one, an error-code catch in another, and nothing in the third.
 */
export function isDesignId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

const PAGE_COLUMNS = `
  design_id, id, position, name, template_id, width, height,
  background_type, background, objects, effects
`;

/**
 * Writes a project's pages, replacing whatever was there.
 *
 * Autosave sends the whole document — that is what the editor holds and what
 * keeps client and server from disagreeing about a partial edit. Replacing the
 * page set is therefore the honest operation; the alternative, diffing pages
 * server-side, would only re-derive what the client already knows.
 */
async function writePages(
  client: Parameters<Parameters<typeof transaction>[0]>[0],
  designId: string,
  project: EditorProject,
): Promise<void> {
  const writes = projectToPageWrites(project);
  const keptIds = writes.map((write) => write.id);

  await client.query(
    "delete from design_pages where design_id = $1 and id <> all($2::text[])",
    [designId, keptIds],
  );

  for (const write of writes) {
    await client.query(
      `insert into design_pages (${PAGE_COLUMNS})
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       on conflict (design_id, id) do update set
         position = excluded.position,
         name = excluded.name,
         template_id = excluded.template_id,
         width = excluded.width,
         height = excluded.height,
         background_type = excluded.background_type,
         background = excluded.background,
         objects = excluded.objects,
         effects = excluded.effects`,
      [
        designId,
        write.id,
        write.position,
        write.name,
        write.templateId,
        write.width,
        write.height,
        write.backgroundType,
        JSON.stringify(write.background),
        JSON.stringify(write.objects),
        write.effects,
      ],
    );
  }
}

/**
 * Creates a design and enrols the guest session that owns it.
 *
 * Both land in one transaction: a design whose session never got written would
 * be stranded the moment the owner cookie is lost, with no code to find it by.
 */
export async function createDesign(
  ownerId: string,
  project: EditorProject,
): Promise<{ saved: SavedDesign; session: GuestSession }> {
  return transaction(async (client) => {
    const { rows } = await client.query<DesignRow>(
      "insert into designs (owner_id, title) values ($1, $2) returning *",
      [ownerId, project.title],
    );
    const design = rows[0];

    await writePages(client, design.id, project);

    // The page triggers moved `updated_at`, so read it back rather than
    // reporting the value from before the pages landed.
    const { rows: fresh } = await client.query<DesignRow>(
      "select version, updated_at from designs where id = $1",
      [design.id],
    );

    const session = await ensureGuestSession(ownerId, client);

    return {
      saved: {
        id: design.id,
        version: fresh[0].version,
        updatedAt: fresh[0].updated_at.toISOString(),
      },
      session,
    };
  });
}

/**
 * Saves over an existing design.
 *
 * `expectedVersion` is the optimistic lock: two tabs editing the same design
 * would otherwise take turns silently overwriting each other. A mismatch is
 * reported to the caller instead of resolved here — only the user can say which
 * version they meant.
 */
export async function saveDesign(
  owners: string[],
  designId: string,
  project: EditorProject,
  expectedVersion: number,
  /** The browser doing the editing, whose session the save keeps alive. */
  activeOwnerId: string | null,
): Promise<SavedDesign> {
  if (owners.length === 0) throw new DesignNotFoundError();

  return transaction(async (client) => {
    // Lock the row for the whole save so a concurrent writer waits rather than
    // interleaving its pages with ours.
    const { rows } = await client.query<DesignRow>(
      `select * from designs
        where id = $1 and owner_id = any($2::uuid[]) and deleted_at is null
        for update`,
      [designId, owners],
    );

    const design = rows[0];
    if (!design) throw new DesignNotFoundError();
    if (design.version !== expectedVersion) {
      throw new DesignConflictError(design.version);
    }

    await writePages(client, designId, project);

    const { rows: updated } = await client.query<DesignRow>(
      `update designs
          set title = $2, version = version + 1
        where id = $1
        returning version, updated_at`,
      [designId, project.title],
    );

    // Autosave is the strongest signal a guest is still at the booth, so it
    // pushes back `last_seen_at`. Sessions that only ever expire on the clock
    // would sweep away someone mid-edit on a long sitting.
    //
    // The session bumped is the *editing browser's*, not the design's owner.
    // Those differ once an account claims its work: the design moves to the
    // account id, while the session that can still expire is the one on the
    // device someone is sitting at. Keeping the design's owner alive instead
    // would sweep the booth out from under a guest who is mid-edit.
    if (activeOwnerId) {
      await client.query(
        "update guest_sessions set last_seen_at = now() where owner_id = $1",
        [activeOwnerId],
      );
    }

    return {
      id: designId,
      version: updated[0].version,
      updatedAt: updated[0].updated_at.toISOString(),
    };
  });
}

export interface LoadedDesign {
  project: EditorProject;
  version: number;
}

/** One row per design, enough to draw a card without loading the artwork. */
export interface DesignSummary {
  id: string;
  title: string;
  version: number;
  updatedAt: string;
  pageCount: number;
  /** Size of the first page, for the card's aspect ratio. */
  width: number | null;
  height: number | null;
}

interface DesignSummaryRow {
  id: string;
  title: string;
  version: number;
  updated_at: Date;
  page_count: number;
  width: number | null;
  height: number | null;
}

/**
 * The owner's designs, newest first.
 *
 * Page count and cover size come from a lateral join rather than a second
 * round trip, and the `objects` column is deliberately never selected — a list
 * of ten designs would otherwise drag every photo in them across the wire.
 */
export async function listDesigns(
  owners: string[],
  limit = 50,
): Promise<DesignSummary[]> {
  if (owners.length === 0) return [];

  const rows = await query<DesignSummaryRow>(
    `select d.id,
            d.title,
            d.version,
            d.updated_at,
            coalesce(counted.page_count, 0)::int as page_count,
            cover.width,
            cover.height
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
      where d.owner_id = any($1::uuid[]) and d.deleted_at is null
      order by d.updated_at desc
      limit $2`,
    [owners, limit],
  );

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    version: row.version,
    updatedAt: row.updated_at.toISOString(),
    pageCount: row.page_count,
    width: row.width,
    height: row.height,
  }));
}

export async function loadDesign(
  owners: string[],
  designId: string,
): Promise<LoadedDesign | null> {
  if (owners.length === 0 || !isDesignId(designId)) return null;

  const designs = await query<DesignRow>(
    `select * from designs
      where id = $1 and owner_id = any($2::uuid[]) and deleted_at is null`,
    [designId, owners],
  );
  const design = designs[0];
  if (!design) return null;

  const pages = await query<DesignPageRow>(
    "select * from design_pages where design_id = $1 order by position",
    [designId],
  );

  return {
    project: rowsToProject({ design, pages }),
    version: design.version,
  };
}

/**
 * Whether a design is one of this owner's.
 *
 * A membership question, deliberately not a read: callers use it to decide
 * whether a claim about a design may be recorded, and loading the artwork to
 * answer "is this yours" would drag the photos across for nothing.
 */
export async function designBelongsTo(
  ownerId: string,
  designId: string,
): Promise<boolean> {
  const rows = await query<{ ok: boolean }>(
    `select true as ok from designs
      where id = $1 and owner_id = $2 and deleted_at is null`,
    [designId, ownerId],
  );

  return rows.length > 0;
}

/**
 * Renames a design.
 *
 * Scoped by owner in the WHERE clause rather than checked first: a separate
 * "is this yours" read would leave a window in which it stops being, and a
 * rename that touches no row is already the answer the caller needs.
 */
export async function renameDesign(
  owners: string[],
  designId: string,
  title: string,
): Promise<GalleryDesign | null> {
  const rows = await query<{ id: string }>(
    `update designs
        set title = $3
      where id = $1
        and owner_id = any($2::uuid[])
        and deleted_at is null
     returning id`,
    [designId, owners, title.trim()],
  );

  return rows[0] ? getGalleryDesign(owners, designId) : null;
}

/**
 * Removes a design from the gallery.
 *
 * Soft: the row is stamped, not deleted. A design carries the photos of people
 * who are no longer at the booth, and "I deleted the wrong one" is a sentence
 * somebody says about every gallery ever built. The sweep decides when the rows
 * actually go; this decides when they stop being yours to see.
 */
export async function deleteDesign(
  owners: string[],
  designId: string,
): Promise<boolean> {
  const rows = await query<{ id: string }>(
    `update designs
        set deleted_at = now()
      where id = $1
        and owner_id = any($2::uuid[])
        and deleted_at is null
     returning id`,
    [designId, owners],
  );

  return rows.length > 0;
}

/**
 * Copies a design, pages and all.
 *
 * The copy is made in the database rather than by round-tripping the project
 * through the caller: a design is megabytes of inline photos, and sending them
 * out only to have them sent back is the most expensive possible way to say
 * "again". It belongs to the same owner the original does — duplicating on a
 * browser that has since claimed a session must not quietly move the copy to a
 * different identity than its original.
 */
export async function duplicateDesign(
  owners: string[],
  designId: string,
): Promise<GalleryDesign | null> {
  if (owners.length === 0 || !isDesignId(designId)) return null;

  const copyId = await transaction(async (client) => {
    const { rows: source } = await client.query<{
      id: string;
      owner_id: string;
      title: string;
    }>(
      `select id, owner_id, title from designs
        where id = $1 and owner_id = any($2::uuid[]) and deleted_at is null`,
      [designId, owners],
    );

    const original = source[0];
    if (!original) return null;

    const { rows: created } = await client.query<{ id: string }>(
      `insert into designs (owner_id, title)
       values ($1, $2)
       returning id`,
      [original.owner_id, `${original.title} (salinan)`.slice(0, 200)],
    );
    const copy = created[0];

    await client.query(
      `insert into design_pages
         (design_id, id, position, name, template_id, width, height,
          background_type, background, objects, effects)
       select $2, id, position, name, template_id, width, height,
              background_type, background, objects, effects
         from design_pages
        where design_id = $1`,
      [designId, copy.id],
    );

    return copy.id;
  });

  return copyId ? getGalleryDesign(owners, copyId) : null;
}

export interface PageSummary {
  id: string;
  name: string;
  position: number;
  width: number;
  height: number;
  /** Derived from the size, so the strip can shape a chip without the objects. */
  orientation: "portrait" | "landscape" | "square";
  /** How many objects the page holds, and how many of those are photo slots. */
  objectCount: number;
  slotCount: number;
  /** How many of those slots have a photo in them. */
  filledSlots: number;
  effects: string[];
  templateId: string | null;
}

interface PageSummaryRow {
  id: string;
  name: string;
  position: number;
  width: number;
  height: number;
  object_count: number;
  slot_count: number;
  filled_slots: number;
  effects: string[];
  template_id: string | null;
}

/**
 * A project's pages, without their contents.
 *
 * The page strip needs a chip per page: its name, its shape, and enough of a
 * hint about what is on it to be worth looking at. It does not need the objects,
 * and the objects are almost the whole document — a strip with photos in it is
 * megabytes, and sending that to draw a row of chips is the difference between
 * a panel that opens and one that waits.
 *
 * So the counts are computed in the database, over the JSONB, and only the
 * numbers travel. `loadDesign` remains the way to get a page you intend to
 * render; this is the way to get a list you intend to click.
 */
export async function listDesignPages(
  owners: string[],
  designId: string,
): Promise<PageSummary[] | null> {
  if (owners.length === 0 || !isDesignId(designId)) return null;

  const design = await query<{ id: string }>(
    `select id from designs
      where id = $1 and owner_id = any($2::uuid[]) and deleted_at is null`,
    [designId, owners],
  );
  // Null and an empty array are different answers: "no such design" and "a
  // design with no pages". The route turns the first into a 404.
  if (design.length === 0) return null;

  const rows = await query<PageSummaryRow>(
    `select p.id, p.name, p.position, p.width, p.height,
            p.effects, p.template_id,
            jsonb_array_length(p.objects) as object_count,
            (select count(*)::int from jsonb_array_elements(p.objects) o
              where o ->> 'kind' = 'slot') as slot_count,
            (select count(*)::int from jsonb_array_elements(p.objects) o
              where o ->> 'kind' = 'slot'
                and coalesce(jsonb_typeof(o -> 'photo'), 'null') <> 'null') as filled_slots
       from design_pages p
      where p.design_id = $1
      order by p.position`,
    [designId],
  );

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    position: row.position,
    width: row.width,
    height: row.height,
    orientation:
      row.width === row.height
        ? "square"
        : row.width > row.height
          ? "landscape"
          : "portrait",
    objectCount: row.object_count,
    slotCount: row.slot_count,
    filledSlots: row.filled_slots,
    effects: row.effects,
    templateId: row.template_id,
  }));
}

export interface AddPageInput {
  /** Insert after this page; omitted or unknown means at the end. */
  after?: string | null;
  /** Copy this page — objects and all — instead of starting blank. */
  copyOf?: string | null;
  name?: string | null;
  width?: number | null;
  height?: number | null;
}

export interface AddedPage {
  page: PageSummary;
  /** The design's new version, which the editor's next autosave must quote. */
  version: number;
}

/**
 * The next free "Halaman N", named by where it sits rather than by how many
 * exist — inserting between two pages should not produce a name that collides
 * with the one after it. Mirrors `nextPageName` in the editor's store, because
 * a page added from the strip and a page added through this endpoint should not
 * be able to end up called different things.
 */
function nextPageName(taken: Set<string>, index: number): string {
  let number = index + 1;
  while (taken.has(`Halaman ${number}`)) number += 1;
  return `Halaman ${number}`;
}

/**
 * Adds a page to a design, inside the database.
 *
 * Copying is the reason this exists. A page's objects carry their photos inline,
 * so duplicating one through the client means sending megabytes out and posting
 * the same megabytes straight back — the same argument `duplicateDesign` makes,
 * one level down. A blank page rides along because it is the same insert with an
 * empty array.
 *
 * Building a page from a *template* is deliberately not here. That is
 * `instantiateTemplate` in the editor — it mints object ids, fits slots to the
 * page, and carries photos across from what was already there — and a second
 * implementation of it in SQL would be a second answer to what a template means.
 *
 * The design's version is bumped, so an editor that was mid-edit finds out its
 * document is stale rather than overwriting the new page with an autosave that
 * never knew about it.
 */
export async function addDesignPage(
  owners: string[],
  designId: string,
  input: AddPageInput = {},
): Promise<AddedPage | null> {
  if (owners.length === 0 || !isDesignId(designId)) return null;

  const inserted = await transaction(async (client) => {
    const { rows: designs } = await client.query<{ version: number }>(
      `select version from designs
        where id = $1 and owner_id = any($2::uuid[]) and deleted_at is null
        for update`,
      [designId, owners],
    );
    if (designs.length === 0) return null;

    const { rows: pages } = await client.query<{
      id: string;
      name: string;
      position: number;
      width: number;
      height: number;
    }>(
      `select id, name, position, width, height from design_pages
        where design_id = $1 order by position`,
      [designId],
    );

    const afterIndex = input.after
      ? pages.findIndex((page) => page.id === input.after)
      : pages.length - 1;
    // An unknown `after` appends rather than failing: the page it named may have
    // been deleted by another tab a moment ago, and "add a page" is not a request
    // worth refusing over where exactly it lands.
    const index = afterIndex === -1 ? pages.length - 1 : afterIndex;

    const source = input.copyOf
      ? pages.find((page) => page.id === input.copyOf)
      : undefined;
    if (input.copyOf && !source) return null;

    // Sized like the page it follows, for the same reason the editor does it: a
    // project full of photostrips rarely wants its next page to be a different
    // shape.
    const neighbour = source ?? pages[index] ?? pages[0];
    const width = input.width ?? neighbour?.width ?? 1200;
    const height = input.height ?? neighbour?.height ?? 1800;

    const taken = new Set(pages.map((page) => page.name));
    const name =
      input.name?.trim() ||
      (source ? uniqueCopyName(taken, source.name) : nextPageName(taken, index + 1));

    const newId = createPageId();
    const position = index + 1;

    // Deferred until commit, so shifting everything down by one never trips the
    // uniqueness of (design_id, position) halfway through.
    await client.query(
      `update design_pages set position = position + 1
        where design_id = $1 and position >= $2`,
      [designId, position],
    );

    if (source) {
      await client.query(
        `insert into design_pages
           (design_id, id, position, name, template_id, width, height,
            background_type, background, objects, effects)
         select design_id, $3, $4, $5, template_id, $6, $7,
                background_type, background, objects, effects
           from design_pages
          where design_id = $1 and id = $2`,
        [designId, source.id, newId, position, name, width, height],
      );
    } else {
      await client.query(
        `insert into design_pages
           (design_id, id, position, name, width, height,
            background_type, background, objects, effects)
         values ($1, $2, $3, $4, $5, $6, 'solid',
                 '{"type":"solid","color":"#ffffff"}'::jsonb, '[]'::jsonb, '{}')`,
        [designId, newId, position, name, width, height],
      );
    }

    const { rows: updated } = await client.query<{ version: number }>(
      "update designs set version = version + 1 where id = $1 returning version",
      [designId],
    );

    return { id: newId, version: updated[0].version };
  });

  if (!inserted) return null;

  const summaries = await listDesignPages(owners, designId);
  const page = summaries?.find((candidate) => candidate.id === inserted.id);
  return page ? { page, version: inserted.version } : null;
}

/** "Photostrip" → "Photostrip (salinan)", then "(salinan 2)" and so on. */
function uniqueCopyName(taken: Set<string>, name: string): string {
  const base = `${name} (salinan)`;
  if (!taken.has(base)) return base;

  let number = 2;
  while (taken.has(`${name} (salinan ${number})`)) number += 1;
  return `${name} (salinan ${number})`;
}

/** Page ids are the editor's own, not uuids — short, and only unique per design. */
function createPageId(): string {
  return `page_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export interface RemovedPage {
  /** The page that is now open in the editor's place — the deleted one's neighbour. */
  nextPageId: string;
  version: number;
}

/**
 * Removes a page from a design.
 *
 * Refuses the last one. A project with no pages is a document that cannot be
 * opened, rendered, or exported — the editor already declines it client-side,
 * and an endpoint that allowed it would let one stray request leave somebody
 * with a design they can never see again.
 *
 * Answers with the neighbour that should take its place, chosen the way a reader
 * expects: the page after it, or the one before when the last page went. Working
 * that out here rather than leaving it to the caller means the strip and the
 * endpoint cannot disagree about where you end up.
 *
 * Positions are closed up so they stay a clean sequence. The unique constraint
 * on (design_id, position) is deferrable, so the gap and the shift can both
 * happen inside one transaction without tripping over each other.
 */
export async function removeDesignPage(
  owners: string[],
  designId: string,
  pageId: string,
): Promise<RemovedPage | "not-found" | "last-page"> {
  if (owners.length === 0 || !isDesignId(designId)) return "not-found";

  return transaction(async (client) => {
    const { rows: designs } = await client.query<{ id: string }>(
      `select id from designs
        where id = $1 and owner_id = any($2::uuid[]) and deleted_at is null
        for update`,
      [designId, owners],
    );
    if (designs.length === 0) return "not-found";

    const { rows: pages } = await client.query<{ id: string; position: number }>(
      "select id, position from design_pages where design_id = $1 order by position",
      [designId],
    );

    const index = pages.findIndex((page) => page.id === pageId);
    if (index === -1) return "not-found";
    if (pages.length <= 1) return "last-page";

    await client.query(
      "delete from design_pages where design_id = $1 and id = $2",
      [designId, pageId],
    );
    await client.query(
      `update design_pages set position = position - 1
        where design_id = $1 and position > $2`,
      [designId, pages[index].position],
    );

    const { rows: updated } = await client.query<{ version: number }>(
      "update designs set version = version + 1 where id = $1 returning version",
      [designId],
    );

    return {
      nextPageId: (pages[index + 1] ?? pages[index - 1]).id,
      version: updated[0].version,
    };
  });
}

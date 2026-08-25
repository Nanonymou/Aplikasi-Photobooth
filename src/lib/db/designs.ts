import "server-only";

import { query, transaction } from "@/lib/db/client";
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

const PAGE_COLUMNS = `
  design_id, id, position, name, template_id, width, height,
  background_type, background, objects
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
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       on conflict (design_id, id) do update set
         position = excluded.position,
         name = excluded.name,
         template_id = excluded.template_id,
         width = excluded.width,
         height = excluded.height,
         background_type = excluded.background_type,
         background = excluded.background,
         objects = excluded.objects`,
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
  ownerId: string,
  designId: string,
  project: EditorProject,
  expectedVersion: number,
): Promise<SavedDesign> {
  return transaction(async (client) => {
    // Lock the row for the whole save so a concurrent writer waits rather than
    // interleaving its pages with ours.
    const { rows } = await client.query<DesignRow>(
      `select * from designs
        where id = $1 and owner_id = $2 and deleted_at is null
        for update`,
      [designId, ownerId],
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
    await client.query(
      "update guest_sessions set last_seen_at = now() where owner_id = $1",
      [ownerId],
    );

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
  ownerId: string,
  limit = 50,
): Promise<DesignSummary[]> {
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
      where d.owner_id = $1 and d.deleted_at is null
      order by d.updated_at desc
      limit $2`,
    [ownerId, limit],
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
  ownerId: string,
  designId: string,
): Promise<LoadedDesign | null> {
  const designs = await query<DesignRow>(
    "select * from designs where id = $1 and owner_id = $2 and deleted_at is null",
    [designId, ownerId],
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

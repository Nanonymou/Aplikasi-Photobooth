import "server-only";

import { query } from "@/lib/db/client";

/**
 * Bookkeeping for temporary render files.
 *
 * The bytes are in the render bucket; these rows are what give them an owner
 * and an end date. Storage on its own would keep everything forever.
 */

export interface RenderFile {
  storageKey: string;
  url: string;
  contentType: string;
  filename: string;
  bytes: number;
  width: number | null;
  height: number | null;
  expiresAt: string;
  createdAt: string;
}

interface RenderRow {
  storage_key: string;
  content_type: string;
  filename: string;
  bytes: number;
  width: number | null;
  height: number | null;
  expires_at: Date;
  created_at: Date;
}

function toRenderFile(row: RenderRow): RenderFile {
  return {
    storageKey: row.storage_key,
    url: `/api/export/files/${row.storage_key}`,
    contentType: row.content_type,
    filename: row.filename,
    bytes: row.bytes,
    width: row.width,
    height: row.height,
    expiresAt: row.expires_at.toISOString(),
    createdAt: row.created_at.toISOString(),
  };
}

export interface RenderInput {
  storageKey: string;
  contentType: string;
  filename: string;
  bytes: number;
  width?: number | null;
  height?: number | null;
  /** Hours to keep it; the column default applies when omitted. */
  hours?: number;
}

/**
 * Records a render, or extends the one already there.
 *
 * Two exports of the same design at the same settings produce identical bytes
 * and therefore the same key. That is a second request for the same file, not a
 * duplicate — so its clock restarts rather than a second row appearing.
 */
export async function recordRender(
  ownerId: string,
  input: RenderInput,
): Promise<RenderFile> {
  const rows = await query<RenderRow>(
    `insert into render_files
       (storage_key, owner_id, content_type, filename, bytes, width, height, expires_at)
     values ($1,$2,$3,$4,$5,$6,$7, coalesce($8::timestamptz, now() + interval '12 hours'))
     on conflict (storage_key) do update set
       owner_id = excluded.owner_id,
       filename = excluded.filename,
       expires_at = greatest(render_files.expires_at, excluded.expires_at)
     returning *`,
    [
      input.storageKey,
      ownerId,
      input.contentType,
      input.filename,
      input.bytes,
      input.width ?? null,
      input.height ?? null,
      input.hours
        ? new Date(Date.now() + input.hours * 3_600_000).toISOString()
        : null,
    ],
  );

  return toRenderFile(rows[0]);
}

/** A live render belonging to this owner, or null. */
export async function findRender(
  ownerId: string,
  storageKey: string,
): Promise<RenderFile | null> {
  const rows = await query<RenderRow>(
    `select * from render_files
      where storage_key = $1 and owner_id = $2 and expires_at > now()`,
    [storageKey, ownerId],
  );
  return rows[0] ? toRenderFile(rows[0]) : null;
}

/**
 * Removes expired rows and returns the keys whose bytes may go.
 *
 * A key still referenced by a live row — the same export requested again by
 * someone else — is held back, because the file is one object shared by both
 * rows and deleting it would break the other.
 */
export async function collectExpiredRenders(limit = 500): Promise<string[]> {
  const deleted = await query<{ storage_key: string }>(
    `delete from render_files
      where storage_key in (
        select storage_key from render_files where expires_at <= now() limit $1
      )
      returning storage_key`,
    [limit],
  );

  const keys = deleted.map((row) => row.storage_key);
  if (keys.length === 0) return [];

  const stillUsed = await query<{ storage_key: string }>(
    "select storage_key from render_files where storage_key = any($1::text[])",
    [keys],
  );
  const used = new Set(stillUsed.map((row) => row.storage_key));

  return keys.filter((key) => !used.has(key));
}

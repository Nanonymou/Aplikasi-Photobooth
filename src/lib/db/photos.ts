import "server-only";

import { query } from "@/lib/db/client";

export type PhotoSource = "camera" | "upload" | "demo";

export interface PhotoRecord {
  id: string;
  storageKey: string;
  url: string;
  contentType: string;
  source: PhotoSource;
  width: number;
  height: number;
  bytes: number;
  mirrored: boolean;
  capturedAt: string | null;
  createdAt: string;
}

interface PhotoRow {
  id: string;
  storage_key: string;
  content_type: string;
  source: PhotoSource;
  width: number;
  height: number;
  bytes: number;
  mirrored: boolean;
  captured_at: Date | null;
  created_at: Date;
}

function toRecord(row: PhotoRow): PhotoRecord {
  return {
    id: row.id,
    storageKey: row.storage_key,
    url: `/api/photos/${row.storage_key}`,
    contentType: row.content_type,
    source: row.source,
    width: row.width,
    height: row.height,
    bytes: row.bytes,
    mirrored: row.mirrored,
    capturedAt: row.captured_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
  };
}

export interface PhotoMetadata {
  storageKey: string;
  contentType: string;
  source: PhotoSource;
  width: number;
  height: number;
  bytes: number;
  mirrored: boolean;
  capturedAt: string | null;
}

/**
 * Records a photo, or returns the existing record if it was already recorded.
 *
 * A retried request — a flaky connection during a photobooth session is the
 * normal case, not the exception — must not produce a second row for the same
 * shot, and the unique key on (owner, storage key) is what makes the retry
 * harmless. The capture settings are refreshed on conflict so a correction
 * still lands.
 */
export async function recordPhoto(
  ownerId: string,
  metadata: PhotoMetadata,
): Promise<PhotoRecord> {
  const rows = await query<PhotoRow>(
    `insert into photos
       (owner_id, storage_key, content_type, source, width, height, bytes,
        mirrored, captured_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     on conflict (owner_id, storage_key) do update set
       source = excluded.source,
       mirrored = excluded.mirrored,
       captured_at = excluded.captured_at
     returning *`,
    [
      ownerId,
      metadata.storageKey,
      metadata.contentType,
      metadata.source,
      metadata.width,
      metadata.height,
      metadata.bytes,
      metadata.mirrored,
      metadata.capturedAt,
    ],
  );

  return toRecord(rows[0]);
}

export async function getPhotoByKey(
  ownerId: string,
  storageKey: string,
): Promise<PhotoRecord | null> {
  const rows = await query<PhotoRow>(
    "select * from photos where owner_id = $1 and storage_key = $2",
    [ownerId, storageKey],
  );
  return rows[0] ? toRecord(rows[0]) : null;
}

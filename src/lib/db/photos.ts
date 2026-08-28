import "server-only";

import { query } from "@/lib/db/client";

export type PhotoSource = "camera" | "upload" | "demo";

export interface PhotoRecord {
  id: string;
  storageKey: string;
  sessionId: string | null;
  /** Shot number within its session. */
  position: number | null;
  /** When the booth may forget this photo. */
  expiresAt: string;
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
  session_id: string | null;
  position: number | null;
  expires_at: Date;
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
    sessionId: row.session_id,
    position: row.position,
    expiresAt: row.expires_at.toISOString(),
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
  sessionId?: string | null;
  position?: number | null;
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
        mirrored, captured_at, session_id, position)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     on conflict (owner_id, storage_key) do update set
       source = excluded.source,
       mirrored = excluded.mirrored,
       captured_at = excluded.captured_at,
       session_id = coalesce(excluded.session_id, photos.session_id),
       position = coalesce(excluded.position, photos.position),
       -- A photo recorded again is a photo still in use; give it a fresh life.
       deleted_at = null
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
      metadata.sessionId ?? null,
      metadata.position ?? null,
    ],
  );

  return toRecord(rows[0]);
}

export async function getPhotoByKey(
  ownerId: string,
  storageKey: string,
): Promise<PhotoRecord | null> {
  const rows = await query<PhotoRow>(
    `select * from photos
      where owner_id = $1 and storage_key = $2 and deleted_at is null`,
    [ownerId, storageKey],
  );
  return rows[0] ? toRecord(rows[0]) : null;
}

export interface PhotoSession {
  id: string;
  label: string | null;
  designId: string | null;
  startedAt: string;
  endedAt: string;
  photos: PhotoRecord[];
}

interface SessionRow {
  id: string;
  label: string | null;
  design_id: string | null;
  started_at: Date;
  ended_at: Date;
}

export async function startSession(
  ownerId: string,
  options: {
    label?: string | null;
    designId?: string | null;
    /** The event this sitting happened at, when a booth is running one. */
    eventId?: string | null;
  } = {},
): Promise<PhotoSession> {
  const rows = await query<SessionRow>(
    `insert into photo_sessions (owner_id, label, design_id, event_id)
     values ($1, $2, $3, $4)
     returning *`,
    [
      ownerId,
      options.label ?? null,
      options.designId ?? null,
      options.eventId ?? null,
    ],
  );

  const row = rows[0];
  return {
    id: row.id,
    label: row.label,
    designId: row.design_id,
    startedAt: row.started_at.toISOString(),
    endedAt: row.ended_at.toISOString(),
    photos: [],
  };
}

/**
 * The caller's history: sessions newest first, each with its shots in order.
 *
 * Two queries rather than one join, on purpose — a join would repeat every
 * session row once per photo, and the assembly below is cheaper than paying
 * that on the wire. Loose photos (recorded outside any session) come back under
 * a session id of `null` so nothing a guest took is ever invisible.
 */
export async function listHistory(
  ownerId: string,
  limit = 30,
): Promise<PhotoSession[]> {
  const sessions = await query<SessionRow>(
    `select * from photo_sessions
      where owner_id = $1
      order by ended_at desc
      limit $2`,
    [ownerId, limit],
  );

  const photos = await query<PhotoRow>(
    `select * from photos
      where owner_id = $1 and deleted_at is null
      order by coalesce(position, 0), created_at`,
    [ownerId],
  );

  const bySession = new Map<string | null, PhotoRecord[]>();
  for (const row of photos) {
    const key = row.session_id;
    const bucket = bySession.get(key) ?? [];
    bucket.push(toRecord(row));
    bySession.set(key, bucket);
  }

  const grouped: PhotoSession[] = sessions.map((row) => ({
    id: row.id,
    label: row.label,
    designId: row.design_id,
    startedAt: row.started_at.toISOString(),
    endedAt: row.ended_at.toISOString(),
    photos: bySession.get(row.id) ?? [],
  }));

  const loose = bySession.get(null);
  if (loose?.length) {
    grouped.push({
      id: "",
      label: null,
      designId: null,
      startedAt: loose[loose.length - 1].createdAt,
      endedAt: loose[0].createdAt,
      photos: loose,
    });
  }

  return grouped;
}

/** Removes a photo from the history. The bytes go when the purge runs. */
export async function softDeletePhoto(
  ownerId: string,
  storageKey: string,
): Promise<boolean> {
  const rows = await query<{ id: string }>(
    `update photos
        set deleted_at = now()
      where owner_id = $1 and storage_key = $2 and deleted_at is null
      returning id`,
    [ownerId, storageKey],
  );
  return rows.length > 0;
}

/**
 * Rows the booth is allowed to forget: expired, or removed by their owner.
 *
 * Returns the storage keys rather than deleting files itself — the caller owns
 * the storage driver, and a key still referenced by another owner's row must
 * not have its file removed.
 */
export async function collectPurgeable(limit = 500): Promise<string[]> {
  const rows = await query<{ storage_key: string }>(
    `delete from photos
      where id in (
        select id from photos
         where expires_at <= now() or deleted_at is not null
         limit $1
      )
      returning storage_key`,
    [limit],
  );

  const keys = rows.map((row) => row.storage_key);
  if (keys.length === 0) return [];

  // A key another row still points at belongs to someone else's photo.
  const stillUsed = await query<{ storage_key: string }>(
    "select distinct storage_key from photos where storage_key = any($1::text[])",
    [keys],
  );
  const used = new Set(stillUsed.map((row) => row.storage_key));

  return keys.filter((key) => !used.has(key));
}

/**
 * Whether a session belongs to this owner, so a photo cannot be filed into
 * somebody else's sitting by guessing its id.
 */
export async function sessionBelongsTo(
  ownerId: string,
  sessionId: string,
): Promise<boolean> {
  const rows = await query<{ id: string }>(
    "select id from photo_sessions where id = $1 and owner_id = $2",
    [sessionId, ownerId],
  );
  return rows.length > 0;
}

/** How many photos are already filed under a session, for the next position. */
export async function countSessionPhotos(sessionId: string): Promise<number> {
  const rows = await query<{ count: string }>(
    "select count(*) as count from photos where session_id = $1 and deleted_at is null",
    [sessionId],
  );
  return Number(rows[0].count);
}

export interface SlidePhoto {
  id: string;
  url: string;
  width: number;
  height: number;
  /** When it was taken, for the "baru saja" the wall shows. */
  capturedAt: string;
  /** The sitting it came from, so the wall can avoid three of one face in a row. */
  sessionId: string | null;
}

/**
 * Photos taken at an event, newest first.
 *
 * The wall reads this. Newest first because a slideshow at a live event is
 * mostly watched by the person who was just photographed, looking for
 * themselves — and a chronological feed buries them behind the whole evening.
 *
 * Scoped to the event, not to the owner: every guest's photos are taken under
 * the booth account, so "the owner's photos" would be every photo ever taken on
 * this machine, including last weekend's wedding. The event is what makes
 * tonight's wall tonight's.
 *
 * Deleted photos are excluded, and that is the whole moderation story for now: an
 * operator who removes a photo removes it from the wall too, immediately, which
 * is the one thing they need when something goes up that should not have.
 */
export async function listEventPhotos(
  eventId: string,
  limit = 60,
  since?: string,
): Promise<SlidePhoto[]> {
  const rows = await query<{
    id: string;
    storage_key: string;
    width: number;
    height: number;
    captured_at: Date | null;
    created_at: Date;
    session_id: string | null;
  }>(
    `select p.id, p.storage_key, p.width, p.height,
            p.captured_at, p.created_at, p.session_id
       from photos p
       join photo_sessions s on s.id = p.session_id
      where s.event_id = $1
        and p.deleted_at is null
        and ($3::timestamptz is null
             or coalesce(p.captured_at, p.created_at) > $3)
      order by coalesce(p.captured_at, p.created_at) desc
      limit $2`,
    [eventId, limit, since ?? null],
  );

  return rows.map((row) => ({
    id: row.id,
    url: `/api/photos/${row.storage_key}`,
    width: row.width,
    height: row.height,
    capturedAt: (row.captured_at ?? row.created_at).toISOString(),
    sessionId: row.session_id,
  }));
}

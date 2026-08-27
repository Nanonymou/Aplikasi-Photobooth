#!/usr/bin/env node
/**
 * Deletes what the database says may go.
 *
 * Two clocks run in this app: renders expire in hours, photos in weeks (or when
 * a guest removes one). Both are recorded as rows with an `expires_at`, and
 * nothing enforces them until something sweeps — that is this.
 *
 * The rows decide, never the filesystem: storage is content-addressed, so the
 * same bytes can be referenced by more than one row, and only a key with no
 * live row left may have its file removed.
 *
 *   DATABASE_URL=postgres://… node scripts/purge.mjs [--dry-run]
 *
 * Meant for cron, or for a serverless scheduler calling it on a timer.
 */
import { readdir, rm, stat } from "node:fs/promises";
import path from "node:path";

import pg from "pg";

const ROOT = path.resolve(import.meta.dirname, "..");
const DRY_RUN = process.argv.includes("--dry-run");

// Matches `bucketRoot` in src/lib/storage/blob-storage.ts.
const STORAGE = path.join(ROOT, ".storage");

const BUCKETS = {
  photos: path.join(STORAGE, "photos"),
  renders: path.join(STORAGE, "renders"),
  shares: path.join(STORAGE, "shares"),
  avatars: path.join(STORAGE, "avatars"),
};

/**
 * A file this new might be mid-upload.
 *
 * The avatar sweep is the one that enumerates from disk, so it has to allow for
 * the gap between storing the bytes and writing the key onto the profile. A
 * picture uploaded a second ago and not yet attached looks exactly like an
 * orphan; a day later, it is one.
 */
const ORPHAN_GRACE_MS = 24 * 60 * 60 * 1000;

/** Same sharded layout the storage driver writes. */
function pathFor(bucket, key) {
  return path.join(BUCKETS[bucket], key.slice(0, 2), key);
}

async function removeFiles(bucket, keys) {
  if (DRY_RUN) return;
  for (const key of keys) {
    await rm(pathFor(bucket, key), { force: true });
  }
}

/**
 * Deletes the expired rows and reports which keys are now unreferenced.
 *
 * The second query is the important half: a key another live row still points
 * at belongs to someone else's copy, and its file must stay.
 *
 * A dry run only counts. It must not delete either — a preview that quietly
 * empties the table is worse than no preview at all, because the real run
 * afterwards then finds nothing left to do.
 */
async function sweep(client, { table, keyColumn, where }) {
  const doomed = `select ${keyColumn} from ${table} where ${where} limit 1000`;

  const { rows: taken } = DRY_RUN
    ? await client.query(`select ${keyColumn} as key from (${doomed}) doomed`)
    : await client.query(
        `delete from ${table}
          where ${keyColumn} in (${doomed})
          returning ${keyColumn} as key`,
      );

  const keys = [...new Set(taken.map((row) => row.key))];
  if (keys.length === 0) return { rows: 0, files: [] };

  // Rows that would remain after the delete. In a dry run the doomed rows are
  // still there, so they are excluded explicitly to keep both paths honest.
  const { rows: alive } = await client.query(
    `select distinct ${keyColumn} as key from ${table}
      where ${keyColumn} = any($1::text[])${DRY_RUN ? ` and not (${where})` : ""}`,
    [keys],
  );
  const used = new Set(alive.map((row) => row.key));

  return { rows: taken.length, files: keys.filter((key) => !used.has(key)) };
}

/**
 * Avatar files no profile points at any more.
 *
 * Lists what is on disk, asks the database which of those keys are still spoken
 * for, and reports the difference. Files younger than the grace period are left
 * alone whatever the answer, because "not referenced yet" and "not referenced
 * any more" look identical from here.
 */
async function sweepAvatars(client) {
  let shards;
  try {
    shards = await readdir(BUCKETS.avatars, { withFileTypes: true });
  } catch {
    return []; // Nobody has uploaded a picture yet.
  }

  const cutoff = Date.now() - ORPHAN_GRACE_MS;
  const candidates = [];

  for (const shard of shards) {
    if (!shard.isDirectory()) continue;

    const dir = path.join(BUCKETS.avatars, shard.name);
    for (const name of await readdir(dir)) {
      const info = await stat(path.join(dir, name));
      if (info.mtimeMs < cutoff) candidates.push(name);
    }
  }

  if (candidates.length === 0) return [];

  const { rows } = await client.query(
    `select distinct avatar_key as key from user_profiles
      where avatar_key = any($1::text[])`,
    [candidates],
  );
  const used = new Set(rows.map((row) => row.key));

  return candidates.filter((key) => !used.has(key));
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set. See .env.example.");
    process.exit(1);
  }

  const client = new pg.Client({ connectionString });
  await client.connect();

  try {
    const renders = await sweep(client, {
      table: "render_files",
      keyColumn: "storage_key",
      where: "expires_at <= now()",
    });
    await removeFiles("renders", renders.files);

    const photos = await sweep(client, {
      table: "photos",
      keyColumn: "storage_key",
      where: "expires_at <= now() or deleted_at is not null",
    });
    await removeFiles("photos", photos.files);

    /*
     * Shares go in two stages. The file is removed as soon as the link stops
     * working, but the row stays a month longer so `/s/<code>` can answer "this
     * link has expired" instead of "no such link" — the difference between an
     * explanation and a shrug.
     */
    const { rows: deadShares } = await client.query(
      `select distinct storage_key as key from shares
        where (expires_at <= now() or revoked_at is not null)
          and storage_key not in (
            select storage_key from shares
             where expires_at > now() and revoked_at is null
          )`,
    );
    await removeFiles("shares", deadShares.map((row) => row.key));

    const staleShares = "expires_at <= now() - interval '30 days'";
    const { rowCount: shares } = DRY_RUN
      ? await client.query(`select 1 from shares where ${staleShares}`)
      : await client.query(`delete from shares where ${staleShares}`);

    /*
     * Avatars have no expiry and no doomed rows: `user_profiles.avatar_key` is a
     * live reference that is simply replaced when somebody changes their
     * picture. So this is the one sweep that enumerates candidates from disk —
     * and it still lets the database decide, because a key no profile points at
     * is a key nothing points at. There is no second table that can hold an
     * avatar.
     */
    const avatars = await sweepAvatars(client);
    await removeFiles("avatars", avatars);

    /*
     * Sign-in links have no file behind them, so they are a plain delete. Kept
     * a day past their usefulness rather than removed the instant they are
     * spent: "that link was already used" is a better answer than "that link
     * never existed" to somebody who tapped the same mail twice.
     */
    const staleLinks =
      "expires_at <= now() - interval '1 day' or consumed_at <= now() - interval '1 day'";
    const { rowCount: links } = DRY_RUN
      ? await client.query(`select 1 from magic_links where ${staleLinks}`)
      : await client.query(`delete from magic_links where ${staleLinks}`);

    console.log(
      `${DRY_RUN ? "[dry run] " : ""}renders: ${renders.rows} rows, ${renders.files.length} files; ` +
        `photos: ${photos.rows} rows, ${photos.files.length} files; ` +
        `shares: ${deadShares.length} files, ${shares ?? 0} rows; ` +
        `avatars: ${avatars.length} files; ` +
        `magic links: ${links ?? 0} rows`,
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});

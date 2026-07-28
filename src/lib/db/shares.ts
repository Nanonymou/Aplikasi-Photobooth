import "server-only";

import { randomBytes } from "node:crypto";

import { query } from "@/lib/db/client";

/**
 * Share links.
 *
 * A share is one stored file plus a code that stands for it. Everything else —
 * expiry, revocation, the download count — exists because the link leaves the
 * app and the owner needs some say over it afterwards.
 */

const ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const CODE_LENGTH = 10;

/**
 * A code with no meaning in it.
 *
 * Drawn from the CSPRNG rather than from the row's id or a counter: a guessable
 * code would make every other guest's photo reachable by arithmetic. Rejection
 * sampling keeps the alphabet uniform, which matters more here than the handful
 * of bytes it costs.
 */
export function generateShareCode(): string {
  const limit = 256 - (256 % ALPHABET.length);
  let code = "";

  while (code.length < CODE_LENGTH) {
    for (const byte of randomBytes(CODE_LENGTH)) {
      if (byte >= limit) continue;
      code += ALPHABET[byte % ALPHABET.length];
      if (code.length === CODE_LENGTH) break;
    }
  }

  return code;
}

export interface ShareInput {
  storageKey: string;
  contentType: string;
  filename: string;
  bytes: number;
  /** Days the link stays alive; the column's default is used when omitted. */
  days?: number;
}

export interface Share {
  code: string;
  storageKey: string;
  contentType: string;
  filename: string;
  bytes: number;
  expiresAt: string;
  revokedAt: string | null;
  downloadCount: number;
  createdAt: string;
}

interface ShareRow {
  code: string;
  storage_key: string;
  content_type: string;
  filename: string;
  bytes: number;
  expires_at: Date;
  revoked_at: Date | null;
  download_count: number;
  created_at: Date;
}

function toShare(row: ShareRow): Share {
  return {
    code: row.code,
    storageKey: row.storage_key,
    contentType: row.content_type,
    filename: row.filename,
    bytes: row.bytes,
    expiresAt: row.expires_at.toISOString(),
    revokedAt: row.revoked_at?.toISOString() ?? null,
    downloadCount: row.download_count,
    createdAt: row.created_at.toISOString(),
  };
}

export async function createShare(
  ownerId: string,
  input: ShareInput,
): Promise<Share> {
  // A collision is astronomically unlikely, but the primary key is the thing
  // that decides — retrying is cheaper than reasoning about probability.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateShareCode();

    const rows = await query<ShareRow>(
      `insert into shares
         (code, owner_id, storage_key, content_type, filename, bytes, expires_at)
       values ($1,$2,$3,$4,$5,$6, coalesce($7::timestamptz, now() + interval '7 days'))
       on conflict (code) do nothing
       returning *`,
      [
        code,
        ownerId,
        input.storageKey,
        input.contentType,
        input.filename,
        input.bytes,
        input.days
          ? new Date(Date.now() + input.days * 86_400_000).toISOString()
          : null,
      ],
    );

    if (rows[0]) return toShare(rows[0]);
  }

  throw new Error("Gagal membuat kode berbagi.");
}

export type ShareLookup =
  | { status: "ok"; share: Share }
  | { status: "missing" }
  | { status: "expired" }
  | { status: "revoked" };

/**
 * Resolves a code.
 *
 * Expired and revoked are told apart from missing on purpose: "this link has
 * expired" is a different thing to explain to a guest than "this link never
 * existed", and neither reveals anything a holder of the code did not have.
 */
export async function findShare(code: string): Promise<ShareLookup> {
  const rows = await query<ShareRow>("select * from shares where code = $1", [
    code,
  ]);
  const row = rows[0];
  if (!row) return { status: "missing" };
  if (row.revoked_at) return { status: "revoked" };
  if (row.expires_at.getTime() <= Date.now()) return { status: "expired" };

  return { status: "ok", share: toShare(row) };
}

/** Counts a download. Fire-and-forget: the file matters, the tally does not. */
export async function recordShareDownload(code: string): Promise<void> {
  await query(
    `update shares
        set download_count = download_count + 1, last_downloaded_at = now()
      where code = $1`,
    [code],
  );
}

export async function revokeShare(
  ownerId: string,
  code: string,
): Promise<boolean> {
  const rows = await query<{ code: string }>(
    `update shares set revoked_at = now()
      where code = $1 and owner_id = $2 and revoked_at is null
      returning code`,
    [code, ownerId],
  );
  return rows.length > 0;
}

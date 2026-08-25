import "server-only";

import type pg from "pg";

import { query, transaction } from "@/lib/db/client";

/**
 * The anonymous session behind a guest's designs.
 *
 * `owner_id` already identifies the browser (see lib/api/owner); this module
 * gives that id the things a booth needs to talk about it — a short code the
 * guest can read aloud or carry to another screen, and an expiry after which
 * their work may be forgotten.
 *
 * The session is created lazily, on the first save. Minting one for every
 * visitor would fill the table with people who only looked at the landing page.
 */

/** Unambiguous read aloud at a noisy booth: no 0/O, no 1/I. Matches the client. */
const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const CODE_LENGTH = 6;

/** Collisions are rare (~30 bits), but a booth must never fail a save over one. */
const CODE_ATTEMPTS = 5;

export interface GuestSession {
  ownerId: string;
  code: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  /** Set once the guest signed in and took their work with them. */
  claimedAt: string | null;
  claimedBy: string | null;
}

interface GuestSessionRow {
  owner_id: string;
  code: string;
  created_at: Date;
  last_seen_at: Date;
  expires_at: Date;
  claimed_at: Date | null;
  claimed_by: string | null;
}

function toSession(row: GuestSessionRow): GuestSession {
  return {
    ownerId: row.owner_id,
    code: row.code,
    createdAt: row.created_at.toISOString(),
    lastSeenAt: row.last_seen_at.toISOString(),
    expiresAt: row.expires_at.toISOString(),
    claimedAt: row.claimed_at?.toISOString() ?? null,
    claimedBy: row.claimed_by,
  };
}

/**
 * Draws a code from `crypto`, not `Math.random`.
 *
 * The code is not a secret, but it is printed on receipts and read aloud, and a
 * predictable sequence would collide in bursts exactly when a booth is busiest.
 */
function randomCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
  let code = "";
  for (const byte of bytes) code += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  return code;
}

/** Unique-violation, as PostgreSQL reports it. */
function isUniqueViolation(error: unknown): boolean {
  return (error as { code?: string })?.code === "23505";
}

type Queryable = Pick<pg.PoolClient, "query">;

/**
 * The session for this owner, creating one on first use and keeping it fresh.
 *
 * `on conflict do update` makes this a single statement: an existing session has
 * its `last_seen_at` touched — so an active guest is never swept away by a
 * cleanup mid-session — and a new one is inserted with a fresh code. Only the
 * insert can hit a code collision, and that is retried with a new draw rather
 * than surfaced: a guest losing a save because two codes matched would be
 * indefensible.
 *
 * Accepts a client so a save can enrol the session in the same transaction that
 * writes the design.
 */
export async function ensureGuestSession(
  ownerId: string,
  client?: Queryable,
): Promise<GuestSession> {
  const run = client
    ? <Row extends pg.QueryResultRow>(text: string, values: unknown[]) =>
        client.query<Row>(text, values).then((result) => result.rows)
    : query;

  for (let attempt = 0; attempt < CODE_ATTEMPTS; attempt += 1) {
    try {
      const rows = await run<GuestSessionRow>(
        `insert into guest_sessions (owner_id, code)
         values ($1, $2)
         on conflict (owner_id) do update set last_seen_at = now()
         returning *`,
        [ownerId, randomCode()],
      );
      return toSession(rows[0]);
    } catch (error) {
      // Only a colliding code is worth another draw; anything else is real.
      if (!isUniqueViolation(error) || attempt === CODE_ATTEMPTS - 1) throw error;
    }
  }

  // Unreachable: the loop either returns or throws on its last attempt.
  throw new Error("Kode sesi tamu gagal dibuat.");
}

/** The session for this owner, or null if they have never saved anything. */
export async function getGuestSession(
  ownerId: string,
): Promise<GuestSession | null> {
  const rows = await query<GuestSessionRow>(
    "select * from guest_sessions where owner_id = $1",
    [ownerId],
  );
  return rows[0] ? toSession(rows[0]) : null;
}

/**
 * Looks a session up by the code a guest read out.
 *
 * Expired and claimed sessions are excluded: both are over, and saying so as
 * "not found" avoids leaking which codes once existed.
 */
export async function findGuestSessionByCode(
  code: string,
): Promise<GuestSession | null> {
  const rows = await query<GuestSessionRow>(
    `select * from guest_sessions
     where code = $1 and claimed_at is null and expires_at > now()`,
    [code.trim().toUpperCase()],
  );
  return rows[0] ? toSession(rows[0]) : null;
}

/** Everything a claim moved, so the caller can tell the guest what they got. */
export interface ClaimResult {
  session: GuestSession;
  designs: number;
  photos: number;
}

export class GuestSessionNotFoundError extends Error {
  constructor() {
    super("Sesi tamu tidak ditemukan atau sudah berakhir.");
    this.name = "GuestSessionNotFoundError";
  }
}

/**
 * Hands a guest session's work to an account.
 *
 * The transfer is a re-stamp, not a copy: every row that carried the anonymous
 * `owner_id` now carries the account's. Designs keep their ids, so a link or an
 * open editor tab still resolves, and nothing has to be reconciled afterwards.
 *
 * All of it rides one transaction, and the session row is locked first. Two
 * devices claiming the same code at once — a real scenario, since the code is
 * meant to be carried between screens — would otherwise both pass the "is it
 * claimed?" check and split the guest's work across two accounts. `for update`
 * makes the second one wait and then find the session already claimed.
 *
 * Photo sessions, renders, and shares move too. Leaving them behind would strand
 * the guest's photos on an owner id nobody can present a cookie for.
 */
export async function claimGuestSession(
  code: string,
  accountId: string,
): Promise<ClaimResult> {
  return transaction(async (client) => {
    const { rows } = await client.query<GuestSessionRow>(
      `select * from guest_sessions
        where code = $1 and claimed_at is null and expires_at > now()
        for update`,
      [code.trim().toUpperCase()],
    );

    const session = rows[0];
    if (!session) throw new GuestSessionNotFoundError();

    const owner = session.owner_id;
    const moved = async (table: string) => {
      const result = await client.query(
        `update ${table} set owner_id = $2 where owner_id = $1`,
        [owner, accountId],
      );
      return result.rowCount ?? 0;
    };

    // Table names are literals from this module, never caller input.
    const designs = await moved("designs");
    const photos = await moved("photos");
    await moved("photo_sessions");
    await moved("render_files");
    await moved("shares");

    const { rows: claimed } = await client.query<GuestSessionRow>(
      `update guest_sessions
          set claimed_at = now(), claimed_by = $2
        where owner_id = $1
        returning *`,
      [owner, accountId],
    );

    return { session: toSession(claimed[0]), designs, photos };
  });
}

/**
 * Ends a guest session now, rather than waiting for its expiry.
 *
 * Used when a shared booth screen is handed back: the work stays in the database
 * (a cleanup sweep collects it later, and a mistaken tap should not destroy
 * someone's only copy), but the session can no longer be claimed or resumed.
 * Expiring it is enough — deleting the row would also lose the evidence that the
 * code was ever issued, which is what makes a repeat code safe to rule out.
 */
export async function endGuestSession(ownerId: string): Promise<boolean> {
  const rows = await query<{ owner_id: string }>(
    `update guest_sessions
        set expires_at = now()
      where owner_id = $1 and claimed_at is null and expires_at > now()
      returning owner_id`,
    [ownerId],
  );
  return rows.length > 0;
}

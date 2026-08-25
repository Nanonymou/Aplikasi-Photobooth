import "server-only";

import type pg from "pg";

import { query } from "@/lib/db/client";

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

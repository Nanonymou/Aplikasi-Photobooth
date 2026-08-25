import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { query } from "@/lib/db/client";

/**
 * Session records for signed-in browsers.
 *
 * The cookie carries an opaque token; this table decides what it means. Only the
 * token's hash is stored, so what the database holds cannot be replayed as a
 * credential — the same reasoning that keeps passwords out of tables.
 *
 * Sessions slide: using one pushes its expiry forward, so an active user is
 * never logged out mid-session, while a browser left alone for a month is. The
 * slide stops at an absolute ceiling, because a session that refreshes forever
 * is not a session, it is a permanent grant nobody remembers issuing.
 */

/** 256 bits. Long enough that guessing is not a threat model. */
const TOKEN_BYTES = 32;

/** How far each use pushes the expiry out. */
const SLIDE_DAYS = 30;

/**
 * Only refresh when the session has aged past this much of its window. Writing
 * on every request would turn a read into a write for no benefit — and on a busy
 * booth, that write is per navigation.
 */
const REFRESH_AFTER_DAYS = 1;

export interface AuthSession {
  id: string;
  accountId: string;
  expiresAt: string;
  absoluteExpiresAt: string;
}

interface SessionRow {
  id: string;
  account_id: string;
  expires_at: Date;
  absolute_expires_at: Date;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export interface IssuedSession extends AuthSession {
  /** The secret the browser gets. Returned once; only its hash is kept. */
  token: string;
}

export async function createAuthSession(
  accountId: string,
): Promise<IssuedSession> {
  const token = randomBytes(TOKEN_BYTES).toString("base64url");

  const rows = await query<SessionRow>(
    `insert into auth_sessions (account_id, token_hash)
     values ($1, $2)
     returning id, account_id, expires_at, absolute_expires_at`,
    [accountId, hashToken(token)],
  );

  const row = rows[0];
  return {
    token,
    id: row.id,
    accountId: row.account_id,
    expiresAt: row.expires_at.toISOString(),
    absoluteExpiresAt: row.absolute_expires_at.toISOString(),
  };
}

/**
 * Resolves a token to its session, refreshing it if it has aged enough.
 *
 * One statement does both: the `where` clause is the check — live, unrevoked,
 * unexpired — and the `set` is the refresh. Splitting them would leave a window
 * where a session verified as valid is expired by the time it is used, and would
 * cost a second round trip on the hottest path in the app.
 *
 * The new expiry is clamped to the absolute ceiling with `least`, so refreshing
 * can extend a session but never outlive it.
 */
export async function resolveAuthSession(
  token: string,
): Promise<AuthSession | null> {
  const rows = await query<SessionRow>(
    `update auth_sessions
        set last_used_at = now(),
            expires_at = case
              when now() - last_used_at > make_interval(days => $2)
                then least(now() + make_interval(days => $3), absolute_expires_at)
              else expires_at
            end
      where token_hash = $1
        and revoked_at is null
        and expires_at > now()
        and absolute_expires_at > now()
      returning id, account_id, expires_at, absolute_expires_at`,
    [hashToken(token), REFRESH_AFTER_DAYS, SLIDE_DAYS],
  );

  const row = rows[0];
  if (!row) return null;

  return {
    id: row.id,
    accountId: row.account_id,
    expiresAt: row.expires_at.toISOString(),
    absoluteExpiresAt: row.absolute_expires_at.toISOString(),
  };
}

/** Ends one session. Idempotent: signing out twice is not an error. */
export async function revokeAuthSession(token: string): Promise<void> {
  await query(
    `update auth_sessions set revoked_at = now()
      where token_hash = $1 and revoked_at is null`,
    [hashToken(token)],
  );
}

/** Ends every session for an account — "sign me out everywhere". */
export async function revokeAllAuthSessions(accountId: string): Promise<number> {
  const rows = await query<{ id: string }>(
    `update auth_sessions set revoked_at = now()
      where account_id = $1 and revoked_at is null
      returning id`,
    [accountId],
  );
  return rows.length;
}

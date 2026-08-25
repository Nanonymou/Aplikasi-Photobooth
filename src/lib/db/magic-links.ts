import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { query } from "@/lib/db/client";

/**
 * One-time sign-in links.
 *
 * The token exists in the clear exactly twice: in the email, and in the request
 * that redeems it. What is stored is its sha256, so this table is worthless to
 * anyone who reads it — the same trade `auth-sessions.ts` makes, for the same
 * reason.
 */

/** Long enough to be unguessable; short enough to survive a mail client's line wrap. */
const TOKEN_BYTES = 32;

/**
 * How often one address may ask.
 *
 * Matches `max_frequency` in `supabase/config.toml`, because the two are the
 * same promise made to the same person: the fix for "it did not arrive" is
 * usually patience, not a second identical mail.
 */
export const REQUEST_COOLDOWN_SECONDS = 60;

function hash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export interface IssuedLink {
  /** The secret itself. Returned once, never stored, never logged. */
  token: string;
  expiresAt: string;
}

export type IssueResult =
  | { ok: true; link: IssuedLink }
  | { ok: false; retryAfterSeconds: number };

/**
 * Issues a link, unless this address just got one.
 *
 * The cooldown is enforced in the same statement that inserts, so two clicks
 * arriving together cannot both find "no recent link" and both send. A refusal
 * says how long to wait rather than just no — the screen has a countdown to
 * show.
 */
export async function issueMagicLink(email: string): Promise<IssueResult> {
  const address = email.trim().toLowerCase();
  const token = randomBytes(TOKEN_BYTES).toString("base64url");

  const rows = await query<{ expires_at: Date }>(
    `insert into magic_links (email, token_hash)
     select $1, $2
      where not exists (
        select 1 from magic_links
         where email = $1
           and consumed_at is null
           and created_at > now() - make_interval(secs => $3)
      )
     returning expires_at`,
    [address, hash(token), REQUEST_COOLDOWN_SECONDS],
  );

  if (rows[0]) {
    return {
      ok: true,
      link: { token, expiresAt: rows[0].expires_at.toISOString() },
    };
  }

  const [recent] = await query<{ wait: number }>(
    `select ceil(extract(epoch from (
              max(created_at) + make_interval(secs => $2) - now()
            )))::int as wait
       from magic_links
      where email = $1 and consumed_at is null`,
    [address, REQUEST_COOLDOWN_SECONDS],
  );

  return { ok: false, retryAfterSeconds: Math.max(1, recent?.wait ?? 1) };
}

export type RedeemResult =
  | { ok: true; email: string }
  | { ok: false; reason: "unknown" | "expired" | "used" };

/**
 * Redeems a link, once.
 *
 * The check and the stamp are one statement: `where consumed_at is null`
 * decides, and the same UPDATE that decides is the one that marks it. Two
 * requests arriving with the same token — a mail client prefetching the URL
 * while the person taps it — therefore cannot both succeed, because the second
 * finds nothing left to update.
 *
 * A spent or expired link is told apart from an unknown one, because they are
 * different things to explain: "ask for a new one" versus "that link was never
 * ours". Neither reveals anything to someone who did not already hold the token.
 */
export async function redeemMagicLink(token: string): Promise<RedeemResult> {
  const digest = hash(token);

  const rows = await query<{ email: string }>(
    `update magic_links
        set consumed_at = now()
      where token_hash = $1
        and consumed_at is null
        and expires_at > now()
     returning email`,
    [digest],
  );

  if (rows[0]) return { ok: true, email: rows[0].email };

  const [existing] = await query<{ consumed: boolean }>(
    "select consumed_at is not null as consumed from magic_links where token_hash = $1",
    [digest],
  );

  if (!existing) return { ok: false, reason: "unknown" };
  return { ok: false, reason: existing.consumed ? "used" : "expired" };
}

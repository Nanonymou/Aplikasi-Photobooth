import "server-only";

import { createHash } from "node:crypto";

import { cookies } from "next/headers";

/**
 * Who the caller is signed in as, if anyone.
 *
 * Authentication itself is not built yet — the sign-in screens run against a
 * client-side stand-in (src/lib/auth/mock-auth.ts). This is the server half of
 * that same arrangement: a cookie naming the account, so the endpoints that need
 * an identity can be written, tested, and reasoned about now.
 *
 * It is deliberately read-only and deliberately not called a session: nothing
 * here mints, verifies, or trusts anything beyond the shape of a uuid. When real
 * auth lands it replaces this function, and every caller keeps working, because
 * what they actually depend on is "an account id or nothing".
 */
export const ACCOUNT_COOKIE = "framestudio_account";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getAccountId(): Promise<string | null> {
  const value = (await cookies()).get(ACCOUNT_COOKIE)?.value;
  return value && UUID.test(value) ? value : null;
}

/** A year, matching the guest owner cookie: signing in should outlast a nap. */
const MAX_AGE = 60 * 60 * 24 * 365;

/**
 * The account id for an email address.
 *
 * Derived, not random, so the same person signing in twice lands on the same
 * account and finds the work they claimed last time. Real auth will hand out
 * ids from its own user table; deriving one here keeps that shape — stable,
 * opaque, one per person — without pretending there is a table behind it.
 *
 * Formatted as a v5-style uuid because that is what every `owner_id` column
 * expects; the version nibbles are set so it cannot be mistaken for a random v4.
 */
export function accountIdForEmail(email: string): string {
  const hash = createHash("sha256")
    .update(`framestudio:account:${email.trim().toLowerCase()}`)
    .digest("hex");

  const version = "5";
  const variant = ((parseInt(hash[16], 16) & 0x3) | 0x8).toString(16);

  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    version + hash.slice(13, 16),
    variant + hash.slice(17, 20),
    hash.slice(20, 32),
  ].join("-");
}

/** Starts the (stand-in) signed-in session. Route Handlers only: sets a header. */
export async function setAccountId(accountId: string): Promise<void> {
  const store = await cookies();
  store.set(ACCOUNT_COOKIE, accountId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearAccountId(): Promise<void> {
  (await cookies()).delete(ACCOUNT_COOKIE);
}

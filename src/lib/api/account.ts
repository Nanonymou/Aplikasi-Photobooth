import "server-only";

import { createHash } from "node:crypto";

import { cookies } from "next/headers";

import { resolveAuthSession, revokeAuthSession } from "@/lib/db/auth-sessions";

/**
 * Who the caller is signed in as, if anyone.
 *
 * The cookie carries a session token — an opaque secret that means nothing on
 * its own — and the server resolves it to an account. It deliberately does not
 * carry the account id: that id is derived from an email address, so a cookie
 * holding it could be forged by anyone who knows the address.
 *
 * Authentication of the *credential* is still a stand-in: sign-in verifies the
 * shape of an email, not a password. What is real is everything after that — the
 * session exists in the database, can be revoked, expires, and slides forward as
 * it is used.
 */
export const ACCOUNT_COOKIE = "framestudio_session";

/** Cookie attributes, in one place so every write and clear agrees. */
const COOKIE_OPTIONS = {
  // The token is a bearer credential: script must never be able to read it.
  httpOnly: true,
  // Lax still sends the cookie on a top-level navigation back from an OAuth
  // provider, which `strict` would drop — the user would land signed out.
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
} as const;

/** Matches the session's own slide, so the browser forgets when the server does. */
const MAX_AGE = 60 * 60 * 24 * 30;

export async function getSessionToken(): Promise<string | null> {
  return (await cookies()).get(ACCOUNT_COOKIE)?.value ?? null;
}

/**
 * The signed-in account id, or null.
 *
 * Resolving also refreshes the session when it has aged enough, so simply using
 * the app keeps someone signed in.
 */
export async function getAccountId(): Promise<string | null> {
  const token = await getSessionToken();
  if (!token) return null;

  const session = await resolveAuthSession(token);
  return session?.accountId ?? null;
}

/** Hands the browser its session token. Route Handlers only: sets a header. */
export async function setSessionToken(token: string): Promise<void> {
  const store = await cookies();
  store.set(ACCOUNT_COOKIE, token, { ...COOKIE_OPTIONS, maxAge: MAX_AGE });
}

/**
 * Ends the signed-in session, on the server and in the browser.
 *
 * Revoking first is the part that matters: clearing a cookie only asks a browser
 * to forget a token, and a copy taken beforehand would still work. The row is
 * what makes it stop working.
 *
 * The cookie is overwritten and expired rather than deleted, because a browser
 * matches `Set-Cookie` by name *and* path — a bare delete can silently miss a
 * cookie written with attributes it does not repeat.
 */
export async function clearAccountId(): Promise<void> {
  const token = await getSessionToken();
  if (token) await revokeAuthSession(token);

  const store = await cookies();
  store.set(ACCOUNT_COOKIE, "", { ...COOKIE_OPTIONS, maxAge: 0 });
}

/**
 * The account id for an email address.
 *
 * Derived, not random, so the same person signing in twice lands on the same
 * account and finds the work they claimed last time. Real auth will hand out ids
 * from its own user table; deriving one here keeps that shape — stable, opaque,
 * one per person — without pretending there is a table behind it.
 *
 * Note this is no longer anything a caller can present: it identifies an account
 * inside the server, and reaching it requires a session token.
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

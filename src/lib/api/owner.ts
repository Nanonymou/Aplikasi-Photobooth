import "server-only";

import { cookies } from "next/headers";

/**
 * Who a design belongs to, before there are accounts.
 *
 * A photobooth is used by walk-up guests, so the app has to be useful without a
 * login: the first write mints an owner id and parks it in a cookie, and every
 * later request from that browser lands on the same designs. When authentication
 * arrives it replaces this function — the column it feeds (`designs.owner_id`)
 * and every query built on it stay exactly as they are.
 */
export const OWNER_COOKIE = "framestudio_owner";

/** A year: long enough that a returning guest still finds their designs. */
const MAX_AGE = 60 * 60 * 24 * 365;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Reads the caller's owner id, minting one if this is their first write.
 *
 * Only callable from a Route Handler or Server Function: setting a cookie means
 * writing a response header.
 */
export async function requireOwnerId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(OWNER_COOKIE)?.value;

  // A malformed value can only come from a tampered cookie; replacing it is
  // safer than letting it reach a uuid column.
  if (existing && UUID.test(existing)) return existing;

  const owner = crypto.randomUUID();
  store.set(OWNER_COOKIE, owner, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });

  return owner;
}

/** Reads the owner id without minting one; for reads that may legitimately be empty. */
export async function getOwnerId(): Promise<string | null> {
  const value = (await cookies()).get(OWNER_COOKIE)?.value;
  return value && UUID.test(value) ? value : null;
}

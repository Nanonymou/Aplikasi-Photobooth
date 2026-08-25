import "server-only";

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

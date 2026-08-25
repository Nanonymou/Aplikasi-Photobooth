import "server-only";

import { getAccountId } from "@/lib/api/account";
import { getOwnerId } from "@/lib/api/owner";
import { ownerScope } from "@/lib/db/owners";

/**
 * Every identity the caller can prove is theirs.
 *
 * Ownership in this app is a browser's owner cookie, and an account is a second
 * name for a set of those: the ones it claimed when signing in. Neither replaces
 * the other — work saved after signing in still carries the cookie — so anything
 * asking "is this mine" has to ask about all of them at once.
 *
 * Resolved once per request and passed down, so a handler that loads a design
 * and then saves it does not ask the database twice who is calling.
 *
 * An empty array means a browser with no cookie and no session: it owns nothing,
 * which every caller should treat as "not found" rather than as an error.
 */
export async function callerOwners(): Promise<string[]> {
  const [accountId, cookieOwnerId] = await Promise.all([
    getAccountId(),
    getOwnerId(),
  ]);

  return ownerScope(accountId, cookieOwnerId);
}

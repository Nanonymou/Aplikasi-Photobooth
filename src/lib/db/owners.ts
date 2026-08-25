import "server-only";

import { query } from "@/lib/db/client";

/**
 * Every owner id that belongs to this person.
 *
 * The account itself, every guest session it has claimed, and the browser's
 * current owner id — which may be none of the above yet, on a browser that
 * signed in before it ever saved anything.
 *
 * A signed-out guest has only their cookie, which is the whole of their
 * identity and the whole of their gallery.
 */
export async function ownerScope(
  accountId: string | null,
  cookieOwnerId: string | null,
): Promise<string[]> {
  const ids = new Set<string>();
  if (cookieOwnerId) ids.add(cookieOwnerId);

  if (accountId) {
    ids.add(accountId);

    const claimed = await query<{ owner_id: string }>(
      "select owner_id from guest_sessions where claimed_by = $1",
      [accountId],
    );
    for (const row of claimed) ids.add(row.owner_id);
  }

  return [...ids];
}

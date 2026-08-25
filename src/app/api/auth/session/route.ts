import { clearAccountId } from "@/lib/api/account";
import { getViewer } from "@/lib/api/authorize";
import { jsonError } from "@/lib/api/http";
import { getOwnerId } from "@/lib/api/owner";
import { getGuestSession } from "@/lib/db/guest-sessions";

// `pg` opens TCP sockets, which the edge runtime cannot do.
export const runtime = "nodejs";

/**
 * Who the caller is, and whether a guest session is waiting to be claimed.
 *
 * The second half is what makes this useful to the sign-in screens: a browser
 * holding unclaimed guest work should be told so, so it can offer to bring the
 * work along rather than silently stranding it on the old owner id.
 */
export async function GET(): Promise<Response> {
  const viewer = await getViewer();
  const owner = await getOwnerId();
  const guest = owner ? await getGuestSession(owner) : null;

  return Response.json(
    {
      account: viewer ? { id: viewer.profile.id, email: viewer.profile.email } : null,
      // Sent so the client hides what this role cannot reach instead of
      // hard-coding its own copy of the policy. It is a hint for the UI; the
      // server checks again on every guarded request.
      role: viewer?.profile.role ?? null,
      permissions: viewer?.permissions ?? [],
      // A claimed session is history; only an unclaimed one is an offer.
      guestSession: guest && !guest.claimedAt ? guest : null,
    },
    { headers: { "cache-control": "private, no-store" } },
  );
}

/**
 * No longer a way in.
 *
 * This used to take an email address and hand back a session, which is a login
 * form with the password field removed: anyone who could type someone else's
 * address became them. Proof of the mailbox now lives where it belongs — ask for
 * a link at `POST /api/auth/magic-link`, redeem it at
 * `POST /api/auth/magic-link/verify` — and social sign-in comes through
 * `POST /api/auth/oauth/callback`.
 *
 * Kept as an explicit refusal rather than deleted, because a caller still
 * posting here deserves to be told where the door moved instead of getting a
 * bare 405 that reads like an outage.
 */
export async function POST(): Promise<Response> {
  return jsonError(
    400,
    "Masuk dengan email kini lewat tautan sekali pakai: POST /api/auth/magic-link, lalu POST /api/auth/magic-link/verify.",
  );
}

/**
 * Signs out.
 *
 * Only the account cookie goes. The guest owner cookie is left alone on purpose:
 * it is this browser's identity for anything saved *after* signing out, and
 * clearing it would hand the next visitor a fresh session in the middle of what
 * is often a shared booth screen — the deliberate device wipe is its own action.
 */
export async function DELETE(): Promise<Response> {
  await clearAccountId();
  return Response.json({ account: null });
}

import { clearAccountId } from "@/lib/api/account";
import { jsonError } from "@/lib/api/http";
import { describeMe } from "@/lib/api/me";

// `pg` opens TCP sockets, which the edge runtime cannot do.
export const runtime = "nodejs";

/**
 * Who the caller is, and whether a guest session is waiting to be claimed.
 *
 * A narrower view of `GET /api/me`, and built from it rather than beside it: two
 * descriptions of the same person drift, and the first thing to disagree is a
 * menu against the page it opens. The sign-in screens want exactly this much —
 * am I signed in, what may I do, and is there work here to bring along — so this
 * stays as its own address, not as its own answer.
 */
export async function GET(): Promise<Response> {
  const me = await describeMe();

  return Response.json(
    {
      account: me.profile ? { id: me.profile.id, email: me.profile.email } : null,
      // Sent so the client hides what this role cannot reach instead of
      // hard-coding its own copy of the policy. It is a hint for the UI; the
      // server checks again on every guarded request.
      role: me.role,
      permissions: me.permissions,
      guestSession: me.guestSession,
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

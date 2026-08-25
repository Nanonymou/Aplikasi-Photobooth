import {
  accountIdForEmail,
  clearAccountId,
  getAccountId,
  setAccountId,
} from "@/lib/api/account";
import { jsonError, readJsonBody } from "@/lib/api/http";
import { getOwnerId } from "@/lib/api/owner";
import {
  claimGuestSession,
  getGuestSession,
  GuestSessionNotFoundError,
} from "@/lib/db/guest-sessions";

// `pg` opens TCP sockets, which the edge runtime cannot do.
export const runtime = "nodejs";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Who the caller is, and whether a guest session is waiting to be claimed.
 *
 * The second half is what makes this useful to the sign-in screens: a browser
 * holding unclaimed guest work should be told so, so it can offer to bring the
 * work along rather than silently stranding it on the old owner id.
 */
export async function GET(): Promise<Response> {
  const account = await getAccountId();
  const owner = await getOwnerId();
  const guest = owner ? await getGuestSession(owner) : null;

  return Response.json(
    {
      account: account ? { id: account } : null,
      // A claimed session is history; only an unclaimed one is an offer.
      guestSession: guest && !guest.claimedAt ? guest : null,
    },
    { headers: { "cache-control": "private, no-store" } },
  );
}

/**
 * Signs in, and brings the guest's work with them.
 *
 * This is the integration the whole guest-session feature exists for. Claiming
 * is not a second step the client has to remember: a guest who signs in at the
 * booth almost never means "leave my strip behind", so the claim happens here,
 * in the same request that establishes the session.
 *
 * A failed claim does not fail the sign-in. The session is real either way, and
 * refusing to log someone in because their expired guest work could not be moved
 * would be the worse outcome; the response says what happened instead.
 *
 * Authentication itself is still the stand-in (src/lib/api/account.ts): this
 * verifies the shape of an email, not a password. What it does establish for
 * real is the identity every downstream endpoint reads.
 */
export async function POST(request: Request): Promise<Response> {
  const body = await readJsonBody(request);
  if (!body.ok) return body.response;
  if (!isRecord(body.value)) return jsonError(400, "Body bukan objek JSON.");

  const email = body.value.email;
  if (typeof email !== "string" || !EMAIL.test(email.trim())) {
    return jsonError(400, "Email tidak valid.");
  }

  const accountId = accountIdForEmail(email);
  await setAccountId(accountId);

  // Whatever this browser was working on as a guest comes along.
  let claimed: { designs: number; photos: number } | null = null;
  const owner = await getOwnerId();

  if (owner) {
    const guest = await getGuestSession(owner);
    if (guest && !guest.claimedAt) {
      try {
        const result = await claimGuestSession(guest.code, accountId);
        claimed = { designs: result.designs, photos: result.photos };
      } catch (error) {
        // Expired or claimed in the meantime: nothing to move, still signed in.
        if (!(error instanceof GuestSessionNotFoundError)) {
          console.error("POST /api/auth/session claim failed", error);
        }
      }
    }
  }

  return Response.json({
    account: { id: accountId, email: email.trim().toLowerCase() },
    claimed,
  });
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

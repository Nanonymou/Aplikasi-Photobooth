import { clearAccountId, getAccountId } from "@/lib/api/account";
import { jsonError, readJsonBody } from "@/lib/api/http";
import { getOwnerId } from "@/lib/api/owner";
import { signIn } from "@/lib/api/sign-in";
import { getGuestSession } from "@/lib/db/guest-sessions";

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
 * Signs in with an email address, and brings the guest's work with them.
 *
 * The heavy lifting is `signIn` — session, profile, claim — shared with the
 * social callback so an account gets the same treatment whichever door it came
 * through. What is specific to this route is only the proof of identity, which
 * is still the stand-in: this verifies the shape of an email, not a password.
 */
export async function POST(request: Request): Promise<Response> {
  const body = await readJsonBody(request);
  if (!body.ok) return body.response;
  if (!isRecord(body.value)) return jsonError(400, "Body bukan objek JSON.");

  const email = body.value.email;
  if (typeof email !== "string" || !EMAIL.test(email.trim())) {
    return jsonError(400, "Email tidak valid.");
  }

  try {
    const { profile, claimed } = await signIn({
      email: email.trim(),
      provider: "email",
    });

    return Response.json({ account: { id: profile.id, email: profile.email }, profile, claimed });
  } catch (error) {
    console.error("POST /api/auth/session failed", error);
    return jsonError(500, "Masuk gagal diselesaikan.");
  }
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

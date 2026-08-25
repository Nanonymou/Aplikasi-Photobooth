import { clearAccountId } from "@/lib/api/account";
import { jsonError, readJsonBody } from "@/lib/api/http";
import { clearOwnerId, getOwnerId } from "@/lib/api/owner";
import { endGuestSession } from "@/lib/db/guest-sessions";

// `pg` opens TCP sockets, which the edge runtime cannot do.
export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Signs out.
 *
 * Two different acts share this endpoint, because they look the same to a user
 * and are very different to the machine:
 *
 * - **Signing out** clears the account and nothing else. The guest owner cookie
 *   stays, because it is this browser's identity for anything saved *after*
 *   signing out; wiping it would silently orphan the next thing they make.
 *
 * - **Handing back a shared screen** (`endDeviceSession: true`) also ends the
 *   guest session and forgets the owner cookie, so the next person at the booth
 *   starts as themselves rather than inheriting a stranger's designs. The work
 *   is expired, not deleted: a mistaken tap must not destroy someone's only copy.
 *
 * Signing out never fails on the server's account. If ending the guest session
 * errors, the cookies are still cleared and the caller is still signed out —
 * leaving someone logged in because a cleanup query failed would be the worse
 * outcome by far.
 */
export async function POST(request: Request): Promise<Response> {
  // A body is optional: the common case is a bare sign-out.
  const body = await readJsonBody(request).catch(() => null);
  const value = body && body.ok && isRecord(body.value) ? body.value : {};

  if (value.endDeviceSession !== undefined && typeof value.endDeviceSession !== "boolean") {
    return jsonError(400, "endDeviceSession harus boolean.");
  }

  const endDevice = value.endDeviceSession === true;
  let guestSessionEnded = false;

  if (endDevice) {
    const owner = await getOwnerId();
    if (owner) {
      try {
        guestSessionEnded = await endGuestSession(owner);
      } catch (error) {
        console.error("POST /api/auth/logout: ending guest session failed", error);
      }
    }
    await clearOwnerId();
  }

  await clearAccountId();

  return Response.json({ signedOut: true, deviceCleared: endDevice, guestSessionEnded });
}

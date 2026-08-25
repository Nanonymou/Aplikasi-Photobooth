import { getAccountId } from "@/lib/api/account";
import { jsonError, readJsonBody } from "@/lib/api/http";
import { getOwnerId } from "@/lib/api/owner";
import {
  claimGuestSession,
  getGuestSession,
  GuestSessionNotFoundError,
} from "@/lib/db/guest-sessions";

// `pg` opens TCP sockets, which the edge runtime cannot do.
export const runtime = "nodejs";

const CODE = /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Moves a guest session's work into the signed-in account.
 *
 * Two ways in, because a guest arrives from two directions. Usually they sign in
 * on the booth itself, and the session to claim is simply the one behind their
 * own cookie. Sometimes they carry the code to their phone and sign in there —
 * a device that has never held that cookie — so a code may be given instead.
 *
 * The endpoint reports what moved rather than a bare 204: after handing over
 * their work the guest deserves to be told what they now own.
 */
export async function POST(request: Request): Promise<Response> {
  const account = await getAccountId();
  if (!account) {
    return jsonError(401, "Masuk dulu untuk menyimpan karya tamu ke akun.");
  }

  const body = await readJsonBody(request);
  if (!body.ok) return body.response;
  if (!isRecord(body.value)) return jsonError(400, "Body bukan objek JSON.");

  // An explicit code wins; without one the caller means their own session.
  let code: string | null = null;
  const given = body.value.code;

  if (typeof given === "string" && given.trim() !== "") {
    const normalised = given.trim().toUpperCase();
    if (!CODE.test(normalised)) return jsonError(400, "Kode sesi tidak valid.");
    code = normalised;
  } else if (given !== undefined && given !== null) {
    return jsonError(400, "Kode sesi tidak valid.");
  } else {
    const owner = await getOwnerId();
    // No cookie and no code means there is nothing this caller could be
    // claiming — a 404 says that without inventing an identity for them.
    const own = owner ? await getGuestSession(owner) : null;
    if (!own) return jsonError(404, "Tidak ada sesi tamu untuk diklaim.");
    code = own.code;
  }

  try {
    const result = await claimGuestSession(code, account);
    return Response.json(result);
  } catch (error) {
    if (error instanceof GuestSessionNotFoundError) {
      return jsonError(404, error.message);
    }
    console.error("POST /api/guest/claim failed", error);
    return jsonError(500, "Karya tamu gagal dipindahkan.");
  }
}

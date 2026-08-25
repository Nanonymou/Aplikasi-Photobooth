import { jsonError } from "@/lib/api/http";
import { getOwnerId, requireOwnerId, clearOwnerId } from "@/lib/api/owner";
import {
  endGuestSession,
  ensureGuestSession,
  getGuestSession,
} from "@/lib/db/guest-sessions";

// `pg` opens TCP sockets, which the edge runtime cannot do.
export const runtime = "nodejs";

/**
 * The guest session this browser is holding.
 *
 * Read-only, and it mints nothing: a browser that has never saved anything gets
 * `null` rather than a fresh identity, because looking is not using. The screen
 * that shows a guest their code calls this; the screen that creates work calls
 * POST.
 */
export async function GET(): Promise<Response> {
  const owner = await getOwnerId();
  if (!owner) return Response.json({ session: null });

  try {
    return Response.json(
      { session: await getGuestSession(owner) },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    console.error("GET /api/guest/session failed", error);
    return jsonError(500, "Sesi tamu gagal dimuat.");
  }
}

/**
 * Starts a guest session, or keeps the current one alive.
 *
 * The booth's front door: a walk-up guest tapping "mulai" gets an identity and a
 * short code to find their work by, before they have made anything to attach it
 * to. Saving a design enrols one too — that path has always existed — so this is
 * idempotent by design rather than by accident: the same call from the same
 * browser returns the same session with its clock pushed forward.
 */
export async function POST(): Promise<Response> {
  try {
    const owner = await requireOwnerId();
    return Response.json(
      { session: await ensureGuestSession(owner) },
      { status: 201, headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    console.error("POST /api/guest/session failed", error);
    return jsonError(500, "Sesi tamu gagal dibuat.");
  }
}

/**
 * Hands the booth back.
 *
 * For a shared screen between guests: the session is expired now rather than in
 * thirty days, and the owner cookie goes with it, so the next person to touch it
 * starts as themselves instead of inheriting the last guest's gallery. Their
 * designs are not deleted — the work outlives the sitting, and a claimed account
 * can still reach it.
 */
export async function DELETE(): Promise<Response> {
  const owner = await getOwnerId();

  try {
    if (owner) await endGuestSession(owner);
    await clearOwnerId();

    return Response.json({ session: null });
  } catch (error) {
    console.error("DELETE /api/guest/session failed", error);
    return jsonError(500, "Sesi tamu gagal diakhiri.");
  }
}

import { jsonError, readJsonBody } from "@/lib/api/http";
import { signIn } from "@/lib/api/sign-in";
import { redeemMagicLink } from "@/lib/db/magic-links";

// `pg` opens TCP sockets, which the edge runtime cannot do.
export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** What each refusal means to the person holding the link. */
const REASONS: Record<string, string> = {
  unknown: "Tautan ini tidak dikenali. Minta tautan baru.",
  expired: "Tautan ini sudah kedaluwarsa. Minta tautan baru.",
  used: "Tautan ini sudah dipakai. Minta tautan baru.",
};

/**
 * Turns a link into a session.
 *
 * This is where signing in with an email actually happens — the address alone
 * has never been proof of anything, and now it is not treated as any. Redeeming
 * is one-shot and atomic in the database, so a mail client that prefetches the
 * URL cannot spend the link before its owner taps it and still leave them signed
 * in: whichever request arrives first gets the session, and the second is told
 * the link is used.
 *
 * Everything after that is `signIn`, shared with the social callback: profile,
 * session cookie, and the guest's work claimed along the way.
 */
export async function POST(request: Request): Promise<Response> {
  const body = await readJsonBody(request);
  if (!body.ok) return body.response;
  if (!isRecord(body.value)) return jsonError(400, "Body bukan objek JSON.");

  const token = body.value.token;
  if (typeof token !== "string" || token.trim().length === 0) {
    return jsonError(400, "Token wajib disertakan.");
  }

  try {
    const redeemed = await redeemMagicLink(token.trim());
    if (!redeemed.ok) {
      return jsonError(401, REASONS[redeemed.reason]);
    }

    const { profile, claimed } = await signIn({
      email: redeemed.email,
      provider: "email",
    });

    return Response.json(
      {
        account: { id: profile.id, email: profile.email },
        profile,
        claimed,
      },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    console.error("POST /api/auth/magic-link/verify failed", error);
    return jsonError(500, "Masuk gagal diselesaikan.");
  }
}

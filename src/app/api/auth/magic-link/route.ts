import { isJsonObject, jsonError, readJsonBody } from "@/lib/api/http";
import { deliverMagicLink, magicLinkUrl } from "@/lib/api/mailer";
import { issueMagicLink } from "@/lib/db/magic-links";

// `pg` opens TCP sockets, which the edge runtime cannot do.
export const runtime = "nodejs";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Asks for a sign-in link.
 *
 * Answers 202 whether or not the address has an account, and whether or not the
 * mail actually went out. Both are deliberate. The first is because "no account
 * with that address" is an answer worth having only to someone checking whether
 * a person is a customer here. The second is because the token is the secret,
 * and a response that varied with what happened to it starts leaking the same
 * thing back to the browser.
 *
 * The link is never in the response. Sending it back would be exactly the door
 * this replaces: type an address, receive a session.
 */
export async function POST(request: Request): Promise<Response> {
  const body = await readJsonBody(request);
  if (!body.ok) return body.response;
  if (!isJsonObject(body.value)) return jsonError(400, "Body bukan objek JSON.");

  const email = body.value.email;
  if (typeof email !== "string" || !EMAIL.test(email.trim())) {
    return jsonError(400, "Email tidak valid.");
  }

  try {
    const issued = await issueMagicLink(email);

    if (!issued.ok) {
      // 429 rather than a silent success: the screen has a countdown to show,
      // and pretending to send is how a resend button becomes a mystery.
      return jsonError(429, "Tautan baru saja dikirim. Tunggu sebentar.", {
        retryAfterSeconds: issued.retryAfterSeconds,
      });
    }

    const delivery = await deliverMagicLink(
      email.trim().toLowerCase(),
      magicLinkUrl(issued.link.token),
    );

    return Response.json(
      {
        sent: true,
        // Says whether it left the building. An operator running without a mail
        // provider needs to know the link is in the server log, not the inbox.
        delivered: delivery.delivered,
        expiresAt: issued.link.expiresAt,
      },
      { status: 202, headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    console.error("POST /api/auth/magic-link failed", error);
    return jsonError(500, "Tautan gagal dibuat.");
  }
}

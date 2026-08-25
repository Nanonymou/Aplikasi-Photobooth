import { withPermission } from "@/lib/api/authorize";
import { jsonError, readJsonBody } from "@/lib/api/http";
import {
  deliverMagicLink,
  deliverSupportNote,
  magicLinkUrl,
} from "@/lib/api/mailer";
import { issueMagicLink } from "@/lib/db/magic-links";
import { getUserProfile } from "@/lib/db/user-profiles";

// `pg` opens TCP sockets, which the edge runtime cannot do.
export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const KINDS = ["signin-link", "note"] as const;
type Kind = (typeof KINDS)[number];

/** Long enough to explain something, short enough not to be a knowledge base. */
const MAX_MESSAGE = 2000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Helps a user from the console.
 *
 *   { kind: "signin-link" }              — mail them a fresh sign-in link
 *   { kind: "note", message: "…" }       — mail them a note from support
 *
 * The support desk's two answers to "I cannot get in" and "I do not understand
 * what happened", both of which arrive at an admin looking at one user's row.
 *
 * The link is issued for the *user's* address and delivered to it. It is never
 * returned to the admin, not even partially: an endpoint that handed an admin a
 * working sign-in token would turn "manage users" into "become any user", and
 * the whole reason a magic link is proof of anything is that only the mailbox
 * receives it. What the admin gets back is whether it went out.
 *
 * The same cooldown as a self-service request applies, and for the same reason:
 * a user clicking "send me a link" while an admin sends one too should not get
 * two mails, and neither should be able to use this to flood the other's inbox.
 */
export const POST = withPermission(
  "admin.users.manage",
  async (
    viewer,
    request: Request,
    context: RouteContext<"/api/admin/users/[id]/help">,
  ) => {
    const { id } = await context.params;
    if (!UUID.test(id)) return jsonError(404, "Pengguna tidak ditemukan.");

    const body = await readJsonBody(request);
    if (!body.ok) return body.response;
    if (!isRecord(body.value)) return jsonError(400, "Body bukan objek.");

    const kind = body.value.kind;
    if (!KINDS.includes(kind as Kind)) {
      return jsonError(400, `Jenis bantuan harus salah satu dari: ${KINDS.join(", ")}.`);
    }

    const message = body.value.message;
    if (kind === "note") {
      if (typeof message !== "string" || message.trim().length === 0) {
        return jsonError(400, "Pesan wajib diisi untuk jenis `note`.");
      }
      if (message.trim().length > MAX_MESSAGE) {
        return jsonError(400, `Pesan melebihi ${MAX_MESSAGE} karakter.`);
      }
    } else if (message !== undefined) {
      return jsonError(400, "Jenis `signin-link` tidak menerima pesan.");
    }

    try {
      const target = await getUserProfile(id);
      if (!target) return jsonError(404, "Pengguna tidak ditemukan.");

      if (kind === "note") {
        const delivery = await deliverSupportNote(
          target.email,
          (message as string).trim(),
        );

        console.info(
          `admin ${viewer.profile.id} sent a support note to ${target.id}`,
        );

        return Response.json(
          { sent: true, delivered: delivery.delivered, kind },
          { headers: { "cache-control": "private, no-store" } },
        );
      }

      const issued = await issueMagicLink(target.email);
      if (!issued.ok) {
        return jsonError(429, "Tautan baru saja dikirim ke pengguna ini.", {
          retryAfterSeconds: issued.retryAfterSeconds,
        });
      }

      const delivery = await deliverMagicLink(
        target.email,
        magicLinkUrl(issued.link.token),
      );

      console.info(
        `admin ${viewer.profile.id} sent a sign-in link to ${target.id}`,
      );

      return Response.json(
        {
          sent: true,
          delivered: delivery.delivered,
          kind,
          expiresAt: issued.link.expiresAt,
        },
        { status: 202, headers: { "cache-control": "private, no-store" } },
      );
    } catch (error) {
      console.error(`POST /api/admin/users/${id}/help failed`, error);
      return jsonError(500, "Bantuan gagal dikirim.");
    }
  },
);

import { withPermission } from "@/lib/api/authorize";
import { jsonError, readJsonBody } from "@/lib/api/http";
import {
  deleteContent,
  isContentType,
  setContentStatus,
  type ContentType,
} from "@/lib/db/admin-content";

// `pg` opens TCP sockets, which the edge runtime cannot do.
export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

type Target = { type: ContentType; id: string } | { response: Response };

/**
 * Resolves the kind and id in the path.
 *
 * An unknown kind and an unparseable id both answer 404 rather than 400: to the
 * caller they are the same statement — there is nothing at this address. That
 * ids are uuids, and that stickers live apart from backgrounds, are facts about
 * our storage, not about the request.
 */
async function resolve(
  context: RouteContext<"/api/admin/content/[type]/[id]">,
): Promise<Target> {
  const { type, id } = await context.params;

  if (!isContentType(type) || !UUID.test(id)) {
    return { response: jsonError(404, "Konten tidak ditemukan.") };
  }

  return { type, id };
}

/**
 * Publishes an item or pulls it back to draft.
 *
 * Status is the only field here. Editing what an item *is* — a template's slots,
 * a sticker's glyph — is per-kind work with per-kind validation, and folding it
 * into one endpoint would mean one handler that half-understands four shapes.
 * Publishing is the action this screen actually offers, and it means the same
 * thing for all four.
 *
 * Idempotent on purpose: publishing something already live succeeds and leaves
 * its publication date alone, so a double-click and a stale card both settle on
 * the state the caller asked for.
 */
export const PATCH = withPermission(
  "admin.content.manage",
  async (
    _viewer,
    request: Request,
    context: RouteContext<"/api/admin/content/[type]/[id]">,
  ) => {
    const target = await resolve(context);
    if ("response" in target) return target.response;

    const body = await readJsonBody(request);
    if (!body.ok) return body.response;
    if (!isRecord(body.value)) return jsonError(400, "Body bukan objek.");

    const extra = Object.keys(body.value).filter((key) => key !== "status");
    if (extra.length > 0) {
      return jsonError(
        400,
        `Hanya status yang bisa diubah di sini: ${extra.join(", ")} ditolak.`,
      );
    }

    const status = body.value.status;
    if (status !== "published" && status !== "draft") {
      return jsonError(400, "Status harus 'published' atau 'draft'.");
    }

    try {
      const item = await setContentStatus(target.type, target.id, status);
      if (!item) return jsonError(404, "Konten tidak ditemukan.");

      return Response.json(
        { item },
        { headers: { "cache-control": "private, no-store" } },
      );
    } catch (error) {
      console.error(`PATCH /api/admin/content/${target.type} failed`, error);
      return jsonError(500, "Status konten gagal diubah.");
    }
  },
);

/**
 * Removes an item from the library.
 *
 * Answers with the item as it was: the console names what it just deleted, and
 * a second DELETE of the same id gets a 404 rather than a silent success — which
 * is the honest answer to "delete this thing" when the thing is already gone.
 */
export const DELETE = withPermission(
  "admin.content.manage",
  async (
    _viewer,
    _request: Request,
    context: RouteContext<"/api/admin/content/[type]/[id]">,
  ) => {
    const target = await resolve(context);
    if ("response" in target) return target.response;

    try {
      const item = await deleteContent(target.type, target.id);
      if (!item) return jsonError(404, "Konten tidak ditemukan.");

      return Response.json(
        { deleted: item },
        { headers: { "cache-control": "private, no-store" } },
      );
    } catch (error) {
      console.error(`DELETE /api/admin/content/${target.type} failed`, error);
      return jsonError(500, "Konten gagal dihapus.");
    }
  },
);

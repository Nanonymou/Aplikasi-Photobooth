import { withPermission } from "@/lib/api/authorize";
import { jsonError, readJsonBody } from "@/lib/api/http";
import {
  deleteContent,
  editContent,
  FixedCategoryError,
  isContentType,
  UnknownCategoryError,
  type ContentEdit,
  type ContentType,
} from "@/lib/db/admin-content";

// `pg` opens TCP sockets, which the edge runtime cannot do.
export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Matches the columns' own limit, so a rename fails here rather than in SQL. */
const MAX_LABEL = 120;

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

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
 * Edits an item's name, category, or whether it is live.
 *
 * Any subset: a body that mentions only `status` publishes without touching the
 * label, and one that mentions only `label` renames without republishing. That
 * is why each field is read separately rather than spread — "not mentioned" and
 * "set to nothing" are different instructions.
 *
 * Not the artwork. Replacing the bytes behind an asset would silently change
 * every design already using it, so a new picture is a new asset.
 *
 * Publishing stays idempotent: doing it twice does not restamp the publication
 * date, so a double-click and a stale card both settle where the caller asked.
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

    const allowed = ["label", "categorySlug", "status"];
    const extra = Object.keys(body.value).filter((key) => !allowed.includes(key));
    if (extra.length > 0) {
      return jsonError(
        400,
        `Bidang tidak dikenal: ${extra.join(", ")}. Yang bisa diubah: ${allowed.join(", ")}.`,
      );
    }

    const edit: ContentEdit = {};

    if ("label" in body.value) {
      const label = body.value.label;
      if (typeof label !== "string" || label.trim().length === 0) {
        return jsonError(400, "Nama wajib diisi.");
      }
      if (label.trim().length > MAX_LABEL) {
        return jsonError(400, `Nama melebihi ${MAX_LABEL} karakter.`);
      }
      edit.label = label;
    }

    if ("categorySlug" in body.value) {
      const slug = body.value.categorySlug;
      if (typeof slug !== "string" || !SLUG.test(slug)) {
        return jsonError(400, "Kategori harus slug huruf kecil.");
      }
      edit.categorySlug = slug;
    }

    if ("status" in body.value) {
      const status = body.value.status;
      if (status !== "published" && status !== "draft") {
        return jsonError(400, "Status harus 'published' atau 'draft'.");
      }
      edit.status = status;
    }

    if (Object.keys(edit).length === 0) {
      return jsonError(400, "Tidak ada yang diubah.");
    }

    try {
      const item = await editContent(target.type, target.id, edit);
      if (!item) return jsonError(404, "Konten tidak ditemukan.");

      return Response.json(
        { item },
        { headers: { "cache-control": "private, no-store" } },
      );
    } catch (error) {
      if (
        error instanceof UnknownCategoryError ||
        error instanceof FixedCategoryError
      ) {
        return jsonError(400, error.message);
      }
      console.error(`PATCH /api/admin/content/${target.type} failed`, error);
      return jsonError(500, "Konten gagal diubah.");
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

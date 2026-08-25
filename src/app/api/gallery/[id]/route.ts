import { getAccountId } from "@/lib/api/account";
import { jsonError, readJsonBody } from "@/lib/api/http";
import { getOwnerId } from "@/lib/api/owner";
import { deleteDesign, ownerScope, renameDesign } from "@/lib/db/gallery";

// `pg` opens TCP sockets, which the edge runtime cannot do.
export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Matches the column's own limit, so a rename fails here rather than in SQL. */
const MAX_TITLE = 200;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Renames one design.
 *
 * A design that is not the caller's answers 404 rather than 403: saying "this
 * exists, but not for you" about someone else's private work tells a stranger
 * that an id is real, which is the one thing they could not otherwise learn.
 */
export async function PATCH(
  request: Request,
  context: RouteContext<"/api/gallery/[id]">,
): Promise<Response> {
  const { id } = await context.params;
  if (!UUID.test(id)) return jsonError(404, "Desain tidak ditemukan.");

  const body = await readJsonBody(request);
  if (!body.ok) return body.response;
  if (!isRecord(body.value)) return jsonError(400, "Body bukan objek.");

  const extra = Object.keys(body.value).filter((key) => key !== "title");
  if (extra.length > 0) {
    return jsonError(
      400,
      `Hanya judul yang bisa diubah di sini: ${extra.join(", ")} ditolak.`,
    );
  }

  const title = body.value.title;
  if (typeof title !== "string" || title.trim().length === 0) {
    return jsonError(400, "Judul wajib diisi.");
  }
  if (title.trim().length > MAX_TITLE) {
    return jsonError(400, `Judul melebihi ${MAX_TITLE} karakter.`);
  }

  try {
    const owners = await ownerScope(await getAccountId(), await getOwnerId());
    const design = await renameDesign(owners, id, title);
    if (!design) return jsonError(404, "Desain tidak ditemukan.");

    return Response.json(
      { design },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    console.error(`PATCH /api/gallery/${id} failed`, error);
    return jsonError(500, "Judul gagal diubah.");
  }
}

/**
 * Removes one design from the gallery.
 *
 * Soft, so "I deleted the wrong one" stays recoverable by whoever runs the
 * booth; the sweep decides when the rows really go. A second delete of the same
 * id answers 404, which is the honest reply to "remove this" when it is already
 * gone.
 */
export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/gallery/[id]">,
): Promise<Response> {
  const { id } = await context.params;
  if (!UUID.test(id)) return jsonError(404, "Desain tidak ditemukan.");

  try {
    const owners = await ownerScope(await getAccountId(), await getOwnerId());
    const removed = await deleteDesign(owners, id);
    if (!removed) return jsonError(404, "Desain tidak ditemukan.");

    return Response.json(
      { deleted: id },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    console.error(`DELETE /api/gallery/${id} failed`, error);
    return jsonError(500, "Desain gagal dihapus.");
  }
}

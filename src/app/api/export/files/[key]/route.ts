import { jsonError } from "@/lib/api/http";
import { getOwnerId } from "@/lib/api/owner";
import { findRender } from "@/lib/db/renders";
import { getRenderStorage } from "@/lib/storage/render-storage";

export const runtime = "nodejs";

/**
 * Serves a persisted render.
 *
 * Owner-scoped, unlike a share link: this URL is the caller getting their own
 * file back, and handing it to someone else is what `/api/share` is for. An
 * expired render answers 404 rather than 410 — it was never a link anyone was
 * given, so there is nothing to explain the passing of.
 */
export async function GET(
  _request: Request,
  context: RouteContext<"/api/export/files/[key]">,
): Promise<Response> {
  const { key } = await context.params;

  const owner = await getOwnerId();
  if (!owner) return jsonError(404, "Berkas tidak ditemukan.");

  try {
    const record = await findRender(owner, key);
    if (!record) return jsonError(404, "Berkas tidak ditemukan.");

    const data = await getRenderStorage().read(key);
    if (!data) return jsonError(404, "Berkas tidak ditemukan.");

    return new Response(data as BodyInit, {
      headers: {
        "content-type": record.contentType,
        "content-length": String(data.byteLength),
        "content-disposition": `attachment; filename="${record.filename}"`,
        // Content-addressed and short-lived: safe to keep in the browser for
        // the file's own lifetime, never in a shared cache.
        "cache-control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error(`GET /api/export/files/${key} failed`, error);
    return jsonError(500, "Berkas gagal dimuat.");
  }
}

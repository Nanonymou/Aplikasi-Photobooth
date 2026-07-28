import { jsonError } from "@/lib/api/http";
import { identifyImage } from "@/lib/api/image-file";
import { getPhotoStorage, isValidKey } from "@/lib/storage/photo-storage";

export const runtime = "nodejs";

/**
 * Serves a stored photo.
 *
 * Keys are the SHA-256 of the bytes, so a URL is unguessable and the content
 * behind it can never change — hence the immutable, year-long cache. The key is
 * validated against a strict pattern before it reaches the filesystem: a key is
 * the only user-controlled part of this path.
 *
 * Access is by knowing the URL. Tying photos to their owner needs the row that
 * records who uploaded what, which arrives with the photo-history schema; this
 * route is the seam where that check will go.
 */
export async function GET(
  _request: Request,
  context: RouteContext<"/api/photos/[key]">,
): Promise<Response> {
  const { key } = await context.params;
  if (!isValidKey(key)) return jsonError(404, "Foto tidak ditemukan.");

  try {
    const data = await getPhotoStorage().read(key);
    if (!data) return jsonError(404, "Foto tidak ditemukan.");

    const contentType =
      identifyImage(data)?.contentType ?? "application/octet-stream";

    return new Response(data as BodyInit, {
      headers: {
        "content-type": contentType,
        "content-length": String(data.byteLength),
        "cache-control": "private, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error(`GET /api/photos/${key} failed`, error);
    return jsonError(500, "Foto gagal dimuat.");
  }
}

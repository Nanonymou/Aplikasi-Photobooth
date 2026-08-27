import { jsonError } from "@/lib/api/http";
import { identifyImage } from "@/lib/api/image-file";
import {
  getAvatarStorage,
  isValidAvatarKey,
} from "@/lib/storage/avatar-storage";

export const runtime = "nodejs";

/**
 * Serves a profile picture.
 *
 * Public, and deliberately so: an avatar is drawn beside a name wherever that
 * person appears, including places a viewer has no account for. What protects it
 * is the key — the SHA-256 of the bytes, which nobody can guess and which can
 * never point at different content. That is also why the cache is immutable and
 * a year long: a changed picture is a different key, not a changed file.
 *
 * The key is validated against a strict pattern before it reaches the
 * filesystem. It is the only user-controlled part of this path.
 */
export async function GET(
  _request: Request,
  context: RouteContext<"/api/avatars/[key]">,
): Promise<Response> {
  const { key } = await context.params;
  if (!isValidAvatarKey(key)) return jsonError(404, "Avatar tidak ditemukan.");

  try {
    const data = await getAvatarStorage().read(key);
    if (!data) return jsonError(404, "Avatar tidak ditemukan.");

    const contentType =
      identifyImage(data)?.contentType ?? "application/octet-stream";

    return new Response(data as BodyInit, {
      headers: {
        "content-type": contentType,
        "content-length": String(data.byteLength),
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error(`GET /api/avatars/${key} failed`, error);
    return jsonError(500, "Avatar gagal dimuat.");
  }
}

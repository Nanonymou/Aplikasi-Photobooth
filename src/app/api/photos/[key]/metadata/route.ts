import { jsonError, readJsonBody } from "@/lib/api/http";
import { identifyImage } from "@/lib/api/image-file";
import { getOwnerId, requireOwnerId } from "@/lib/api/owner";
import { getPhotoByKey, recordPhoto, type PhotoSource } from "@/lib/db/photos";
import { getPhotoStorage, isValidKey } from "@/lib/storage/photo-storage";

export const runtime = "nodejs";

const SOURCES: PhotoSource[] = ["camera", "upload", "demo"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Records what a stored photo is.
 *
 * Storage only knows bytes under a hash. This is where a shot becomes *this
 * person's* photo, taken by the camera at a particular moment, mirrored or not
 * — the facts the history view will need and that the file itself cannot say.
 *
 * Dimensions and content type are read from the stored bytes rather than taken
 * from the body: the client already sent the file, so re-deriving them here
 * costs one read and removes a field a caller could get wrong. The body carries
 * only what the server cannot know.
 */
export async function POST(
  request: Request,
  context: RouteContext<"/api/photos/[key]/metadata">,
): Promise<Response> {
  const { key } = await context.params;
  if (!isValidKey(key)) return jsonError(404, "Foto tidak ditemukan.");

  const body = await readJsonBody(request);
  if (!body.ok) return body.response;
  if (!isRecord(body.value)) return jsonError(400, "Body bukan objek JSON.");

  const source = body.value.source;
  if (typeof source !== "string" || !SOURCES.includes(source as PhotoSource)) {
    return jsonError(400, `Sumber foto harus salah satu dari: ${SOURCES.join(", ")}.`);
  }

  const mirrored = body.value.mirrored ?? false;
  if (typeof mirrored !== "boolean") {
    return jsonError(400, "Bidang `mirrored` harus boolean.");
  }

  const capturedAtRaw = body.value.capturedAt;
  let capturedAt: string | null = null;
  if (capturedAtRaw !== undefined && capturedAtRaw !== null) {
    if (
      typeof capturedAtRaw !== "string" ||
      Number.isNaN(Date.parse(capturedAtRaw))
    ) {
      return jsonError(400, "Bidang `capturedAt` harus tanggal ISO.");
    }
    capturedAt = new Date(capturedAtRaw).toISOString();
  }

  try {
    // Recording metadata for bytes that were never uploaded would leave a row
    // pointing at nothing, so the file has to exist first.
    const data = await getPhotoStorage().read(key);
    if (!data) return jsonError(404, "Foto tidak ditemukan di penyimpanan.");

    const image = identifyImage(data);
    if (!image) return jsonError(415, "Berkas tersimpan bukan gambar yang dikenal.");

    const owner = await requireOwnerId();
    const record = await recordPhoto(owner, {
      storageKey: key,
      contentType: image.contentType,
      source: source as PhotoSource,
      width: image.width,
      height: image.height,
      bytes: data.byteLength,
      mirrored,
      capturedAt,
    });

    return Response.json(record, { status: 201 });
  } catch (error) {
    console.error(`POST /api/photos/${key}/metadata failed`, error);
    return jsonError(500, "Metadata foto gagal disimpan.");
  }
}

/** Reads back what was recorded; only ever the caller's own photo. */
export async function GET(
  _request: Request,
  context: RouteContext<"/api/photos/[key]/metadata">,
): Promise<Response> {
  const { key } = await context.params;
  if (!isValidKey(key)) return jsonError(404, "Foto tidak ditemukan.");

  const owner = await getOwnerId();
  if (!owner) return jsonError(404, "Foto tidak ditemukan.");

  try {
    const record = await getPhotoByKey(owner, key);
    if (!record) return jsonError(404, "Foto tidak ditemukan.");

    return Response.json(record, {
      headers: { "cache-control": "private, no-store" },
    });
  } catch (error) {
    console.error(`GET /api/photos/${key}/metadata failed`, error);
    return jsonError(500, "Metadata foto gagal dimuat.");
  }
}

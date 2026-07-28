import { jsonError } from "@/lib/api/http";
import { identifyImage } from "@/lib/api/image-file";
import { requireOwnerId } from "@/lib/api/owner";
import { getPhotoStorage } from "@/lib/storage/photo-storage";

export const runtime = "nodejs";

/** A downscaled capture is well under this; a phone's original may not be. */
export const MAX_PHOTO_BYTES = 25 * 1024 * 1024;

/**
 * Stores a photo from the camera or the device's file picker.
 *
 * Takes `multipart/form-data` with a single `file` field — the same request a
 * plain `<input type="file">` makes, and what the capture path can send its
 * blob through without base64 inflating it by a third.
 *
 * Answers `{ key, url, width, height, bytes, contentType }`. The URL is what
 * goes into a slot; nothing is written to the database here, so the photo has
 * no meaning until something references it.
 */
export async function POST(request: Request): Promise<Response> {
  const type = request.headers.get("content-type") ?? "";
  if (!type.includes("multipart/form-data")) {
    return jsonError(415, "Unggahan harus berupa multipart/form-data.");
  }

  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_PHOTO_BYTES) {
    return jsonError(413, "Berkas terlalu besar.");
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError(400, "Isi unggahan tidak terbaca.");
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return jsonError(400, "Bidang `file` wajib diisi.");
  }
  if (file.size === 0) return jsonError(400, "Berkas kosong.");
  if (file.size > MAX_PHOTO_BYTES) return jsonError(413, "Berkas terlalu besar.");

  const data = new Uint8Array(await file.arrayBuffer());

  // The browser's reported type comes from the filename, so the bytes decide.
  const image = identifyImage(data);
  if (!image) {
    return jsonError(415, "Berkas bukan gambar JPEG, PNG, atau WEBP.");
  }

  try {
    // Minting the owner id here — the guest is about to have something of
    // theirs on the server, which is exactly when they need an identity.
    await requireOwnerId();

    const storage = getPhotoStorage();
    const stored = await storage.put(data, image.extension);

    return Response.json(
      {
        key: stored.key,
        url: storage.url(stored.key),
        contentType: image.contentType,
        width: image.width,
        height: image.height,
        bytes: stored.bytes,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/photos failed", error);
    return jsonError(500, "Foto gagal disimpan.");
  }
}

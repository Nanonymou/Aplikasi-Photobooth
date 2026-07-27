import { CAPTURE_MAX_EDGE } from "@/lib/camera/capture";

/** Rejected before decoding — a guard against someone picking a video or a RAW. */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

const UPLOAD_QUALITY = 0.88;

export class UploadError extends Error {}

/**
 * Reads an image file into a downscaled JPEG data URL, matching what the webcam
 * path produces so both sources cost the same in storage.
 *
 * EXIF orientation is applied while decoding: phone photos are very often stored
 * rotated, and without this they land in the frame sideways.
 */
export async function fileToDataUrl(
  file: File,
  maxEdge: number = CAPTURE_MAX_EDGE,
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new UploadError(`"${file.name}" bukan berkas gambar.`);
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new UploadError(
      `"${file.name}" terlalu besar (maksimal ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB).`,
    );
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new UploadError(`"${file.name}" tidak bisa dibaca sebagai gambar.`);
  }

  try {
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) throw new UploadError("Kanvas tidak tersedia di browser ini.");

    context.drawImage(bitmap, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", UPLOAD_QUALITY);
  } finally {
    bitmap.close();
  }
}

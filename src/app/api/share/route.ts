import QRCode from "qrcode";

import { jsonError } from "@/lib/api/http";
import { identifyImage } from "@/lib/api/image-file";
import { requireOwnerId } from "@/lib/api/owner";
import { createShare } from "@/lib/db/shares";
import { getPhotoStorage } from "@/lib/storage/photo-storage";

export const runtime = "nodejs";

/** A finished export, not a raw camera dump — but still generous for 600 DPI. */
const MAX_BYTES = 40 * 1024 * 1024;

/** Big enough to stay sharp on a kiosk screen and when printed on a card. */
const QR_PIXELS = 1024;

/**
 * Publishes a finished picture and hands back the link and its QR.
 *
 *   multipart: file, filename?, days?
 *     → { code, url, expiresAt, qr: { dataUrl, pixels }, bytes, contentType }
 *
 * This is what turns the editor's share dialog from a mock into something a
 * guest can act on: the URL resolves to the file itself, so scanning the QR on
 * a phone that has never seen this app downloads the photo.
 *
 * The QR comes back inline as a data URL. It is a few kilobytes, it is needed
 * on screen the moment the link exists, and a second round trip to fetch it
 * would be a request for something the server already had in hand.
 *
 * Images only for now — the share dialog offers an HD PNG, and a stored PDF
 * needs the render store that arrives with the temporary-file work.
 */
export async function POST(request: Request): Promise<Response> {
  const type = request.headers.get("content-type") ?? "";
  if (!type.includes("multipart/form-data")) {
    return jsonError(415, "Unggahan harus berupa multipart/form-data.");
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError(400, "Isi unggahan tidak terbaca.");
  }

  const file = form.get("file");
  if (!(file instanceof File)) return jsonError(400, "Bidang `file` wajib diisi.");
  if (file.size === 0) return jsonError(400, "Berkas kosong.");
  if (file.size > MAX_BYTES) return jsonError(413, "Berkas terlalu besar.");

  const daysRaw = form.get("days");
  const days = daysRaw === null ? undefined : Number(daysRaw);
  if (
    days !== undefined &&
    (!Number.isInteger(days) || days < 1 || days > 30)
  ) {
    return jsonError(400, "Bidang `days` harus bilangan 1–30.");
  }

  const data = new Uint8Array(await file.arrayBuffer());
  const image = identifyImage(data);
  if (!image) {
    return jsonError(415, "Berkas bukan gambar JPEG, PNG, atau WEBP.");
  }

  try {
    const owner = await requireOwnerId();
    const storage = getPhotoStorage();
    const stored = await storage.put(data, image.extension);

    const nameField = form.get("filename");
    const filename =
      typeof nameField === "string" && nameField.trim()
        ? nameField.trim().slice(0, 200)
        : `framestudio.${image.extension}`;

    const share = await createShare(owner, {
      storageKey: stored.key,
      contentType: image.contentType,
      filename,
      bytes: stored.bytes,
      days,
    });

    // Built from the request's own origin so the link works behind whatever
    // host, port or proxy this is actually running on.
    const url = new URL(`/s/${share.code}`, request.url).toString();
    const dataUrl = await QRCode.toDataURL(url, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: QR_PIXELS,
      color: { dark: "#0f172a", light: "#ffffff" },
    });

    return Response.json(
      {
        code: share.code,
        url,
        expiresAt: share.expiresAt,
        filename: share.filename,
        bytes: share.bytes,
        contentType: share.contentType,
        width: image.width,
        height: image.height,
        qr: { dataUrl, pixels: QR_PIXELS },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/share failed", error);
    return jsonError(500, "Tautan berbagi gagal dibuat.");
  }
}

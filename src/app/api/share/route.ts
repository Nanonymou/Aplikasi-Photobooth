import QRCode from "qrcode";

import { isJsonObject, jsonError, readJsonBody } from "@/lib/api/http";
import { identifyImage } from "@/lib/api/image-file";
import { getOwnerId, requireOwnerId } from "@/lib/api/owner";
import { findRender } from "@/lib/db/renders";
import { designBelongsTo } from "@/lib/db/designs";
import { createShare, type Share } from "@/lib/db/shares";
import { getRenderStorage } from "@/lib/storage/render-storage";
import { requestOrigin } from "@/lib/api/site";
import { getShareStorage } from "@/lib/storage/share-storage";

export const runtime = "nodejs";

/** A finished export, not a raw camera dump — but still generous for 600 DPI. */
const MAX_BYTES = 40 * 1024 * 1024;

/** Big enough to stay sharp on a kiosk screen and when printed on a card. */
const QR_PIXELS = 1024;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The design this share came from, if the caller said.
 *
 * Optional and only ever a hint about provenance — it decides nothing about
 * access, so an absent or unusable value costs the caller nothing but the
 * gallery's "shared" badge on that card. `undefined` when absent, `null` when
 * present but unusable.
 */
function readDesignId(value: unknown): string | undefined | null {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string" || !UUID.test(value)) return null;
  return value;
}

/** `undefined` when absent, `null` when present but not a sane number of days. */
function readDays(value: unknown): number | undefined | null {
  if (value === undefined || value === null) return undefined;
  const days = Number(value);
  return Number.isInteger(days) && days >= 1 && days <= 30 ? days : null;
}

/**
 * The link plus its QR, built from the public origin so it works behind
 * whatever host, port or proxy this is actually running on — a QR is scanned by
 * a phone that has never heard of this server's own address.
 */
async function shareResponse(share: Share, request: Request): Promise<Response> {
  const url = new URL(`/s/${share.code}`, requestOrigin(request)).toString();

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
      // The QR rides along as a data URL: a few kilobytes, needed on screen the
      // moment the link exists, and a second round trip would only ask for
      // something the server already had in hand.
      qr: { dataUrl, pixels: QR_PIXELS },
    },
    { status: 201 },
  );
}

/**
 * Publishes a finished picture and hands back the link and its QR.
 *
 *   multipart: file, filename?, days?            an exported image, uploaded
 *   json:      { renderKey, filename?, days? }   something already rendered
 *
 * This is what turns the editor's share dialog from a mock into something a
 * guest can act on: the URL resolves to the file itself, so scanning the QR on
 * a phone that has never seen this app opens the photo.
 *
 * The JSON path is also how a PDF gets a link — photo storage holds pictures,
 * the render store holds output, and a share copies whichever it was given into
 * the bucket the link serves from.
 */
export async function POST(request: Request): Promise<Response> {
  const type = request.headers.get("content-type") ?? "";

  if (type.includes("application/json")) return shareRender(request);

  if (!type.includes("multipart/form-data")) {
    return jsonError(
      415,
      "Unggahan harus multipart/form-data, atau JSON berisi `renderKey`.",
    );
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

  const days = readDays(form.get("days"));
  if (days === null) return jsonError(400, "Bidang `days` harus bilangan 1–30.");

  const designId = readDesignId(form.get("designId"));
  if (designId === null) return jsonError(400, "Bidang `designId` bukan id yang valid.");

  const data = new Uint8Array(await file.arrayBuffer());

  // The browser's reported type comes from the filename, so the bytes decide.
  const image = identifyImage(data);
  if (!image) {
    return jsonError(415, "Berkas bukan gambar JPEG, PNG, atau WEBP.");
  }

  try {
    const owner = await requireOwnerId();
    const stored = await getShareStorage().put(data, image.extension);

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
      designId: await ownedDesign(owner, designId),
    });

    return shareResponse(share, request);
  } catch (error) {
    console.error("POST /api/share failed", error);
    return jsonError(500, "Tautan berbagi gagal dibuat.");
  }
}

/**
 * Keeps a claimed provenance honest.
 *
 * The design id arrives from the client, so it is checked against the caller's
 * own designs before it is written — otherwise anyone could stamp their share
 * with someone else's design id and light up a "shared" badge in a gallery that
 * is not theirs. An id that does not check out is dropped rather than refused:
 * the share itself is perfectly valid, it just does not get to claim a parent.
 */
async function ownedDesign(
  ownerId: string,
  designId: string | undefined,
): Promise<string | null> {
  if (!designId) return null;
  return (await designBelongsTo(ownerId, designId)) ? designId : null;
}

/**
 * Shares a file that was already rendered and persisted.
 *
 * The bytes are copied into the share bucket rather than pointed at: a render
 * is swept up within hours, and a link handed to a guest must not go dark
 * because the thing it was made from expired on its own schedule.
 */
async function shareRender(request: Request): Promise<Response> {
  const body = await readJsonBody(request);
  if (!body.ok) return body.response;
  if (!isJsonObject(body.value)) return jsonError(400, "Body bukan objek JSON.");

  const renderKey = body.value.renderKey;
  if (typeof renderKey !== "string") {
    return jsonError(400, "Bidang `renderKey` wajib diisi.");
  }

  const days = readDays(body.value.days);
  if (days === null) return jsonError(400, "Bidang `days` harus bilangan 1–30.");

  const designId = readDesignId(body.value.designId);
  if (designId === null) return jsonError(400, "Bidang `designId` bukan id yang valid.");

  // No cookie means this browser has never rendered anything, so it owns no
  // render to share.
  const owner = await getOwnerId();
  if (!owner) return jsonError(404, "Render tidak ditemukan.");

  try {
    const record = await findRender(owner, renderKey);
    if (!record) return jsonError(404, "Render tidak ditemukan.");

    const data = await getRenderStorage().read(renderKey);
    if (!data) return jsonError(404, "Render tidak ditemukan.");

    const extension = renderKey.split(".").pop() as string;
    const stored = await getShareStorage().put(data, extension);

    const share = await createShare(owner, {
      storageKey: stored.key,
      contentType: record.contentType,
      filename:
        typeof body.value.filename === "string" && body.value.filename.trim()
          ? body.value.filename.trim().slice(0, 200)
          : record.filename,
      bytes: stored.bytes,
      days,
      designId: await ownedDesign(owner, designId),
    });

    return shareResponse(share, request);
  } catch (error) {
    console.error("POST /api/share (render) failed", error);
    return jsonError(500, "Tautan berbagi gagal dibuat.");
  }
}

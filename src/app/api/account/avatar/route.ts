import { getViewer } from "@/lib/api/authorize";
import { jsonError } from "@/lib/api/http";
import { identifyImage } from "@/lib/api/image-file";
import { updateOwnProfile } from "@/lib/db/user-profiles";
import { getAvatarStorage } from "@/lib/storage/avatar-storage";

// `pg` opens TCP sockets, which the edge runtime cannot do.
export const runtime = "nodejs";

/**
 * Generous for a picture the browser has already cropped to 256px, and small
 * enough that a mistake — someone posting a RAW file at this address — is
 * refused before it is read rather than after.
 */
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

/** Bigger than any circle this is drawn in; a wall of pixels helps nobody. */
const MAX_EDGE = 2048;

/**
 * Sets the caller's profile picture.
 *
 * One request stores the bytes *and* attaches them, rather than the upload-then-
 * reference pattern the photo endpoints use. Two reasons. A key that exists but
 * is not attached to anything is a file nobody will ever collect, and a client
 * that handles keys is a client that can point its avatar at any blob whose
 * hash it happens to know. Here the key never leaves the server.
 *
 * `multipart/form-data` with a single `file` field — the request a plain file
 * input makes, and the one the settings form's cropped canvas blob can be sent
 * through without base64 inflating it by a third.
 */
export async function PUT(request: Request): Promise<Response> {
  const viewer = await getViewer();
  if (!viewer) return jsonError(401, "Masuk dulu untuk mengubah foto profil.");

  const type = request.headers.get("content-type") ?? "";
  if (!type.includes("multipart/form-data")) {
    return jsonError(415, "Unggahan harus berupa multipart/form-data.");
  }

  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_AVATAR_BYTES) {
    return jsonError(413, "Gambar terlalu besar — maksimal 2 MB.");
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
  if (file.size > MAX_AVATAR_BYTES) {
    return jsonError(413, "Gambar terlalu besar — maksimal 2 MB.");
  }

  const data = new Uint8Array(await file.arrayBuffer());

  // The browser's reported type comes from the filename, so the bytes decide.
  const image = identifyImage(data);
  if (!image) {
    return jsonError(415, "Berkas bukan gambar JPEG, PNG, atau WEBP.");
  }
  if (image.width > MAX_EDGE || image.height > MAX_EDGE) {
    return jsonError(413, `Gambar maksimal ${MAX_EDGE}×${MAX_EDGE} piksel.`);
  }

  try {
    const stored = await getAvatarStorage().put(data, image.extension);
    const profile = await updateOwnProfile(viewer.profile.id, {
      avatarKey: stored.key,
    });
    if (!profile) return jsonError(404, "Profil tidak ditemukan.");

    return Response.json(
      { profile, bytes: stored.bytes, width: image.width, height: image.height },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    console.error("PUT /api/account/avatar failed", error);
    return jsonError(500, "Foto profil gagal disimpan.");
  }
}

/**
 * Removes the uploaded picture.
 *
 * Only the reference. The bytes are content-addressed and may be another
 * account's picture too, so deleting the file here would take somebody else's
 * face with it; collecting unreferenced blobs is a sweep's job, not a delete
 * button's.
 *
 * What is left is whatever the sign-in provider supplied, which is the right
 * answer to "remove my picture" for an account that never chose one.
 */
export async function DELETE(): Promise<Response> {
  const viewer = await getViewer();
  if (!viewer) return jsonError(401, "Masuk dulu untuk mengubah foto profil.");

  try {
    const profile = await updateOwnProfile(viewer.profile.id, {
      avatarKey: null,
    });
    if (!profile) return jsonError(404, "Profil tidak ditemukan.");

    return Response.json(
      { profile },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    console.error("DELETE /api/account/avatar failed", error);
    return jsonError(500, "Foto profil gagal dihapus.");
  }
}

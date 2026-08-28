/**
 * Editing your own profile.
 *
 * The two fields an account holder owns about themselves, written through the
 * two endpoints that own them: the name via `PATCH /api/account/profile`, the
 * picture via `PUT`/`DELETE /api/account/avatar`. Two calls rather than one,
 * because the avatar is bytes and the name is a string, and folding an image
 * into a JSON body means base64 inflating it by a third for no reason.
 *
 * The avatar goes first. If it fails, the name has not been written either, and
 * the form still shows what the user typed; the other order would save half of
 * a save and report success.
 */

export interface ProfileDraft {
  name: string;
  /** A remote avatar, or null for the initials fallback. */
  avatarUrl: string | null;
}

/** Long enough for a real name, short enough not to be a sentence. */
export const NAME_MAX = 120;

/**
 * What the form will accept, said once.
 *
 * The rule and the message live together because they are the same statement:
 * a validator that returns a boolean leaves the copy to be written a second
 * time, next to it, where the two drift.
 */
export function nameProblem(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length === 0) return "Nama tampilan tidak boleh kosong.";
  if (trimmed.length > NAME_MAX) {
    return `Nama tampilan melebihi ${NAME_MAX} karakter.`;
  }
  return null;
}

/** The message the endpoint sent, or a fallback if it sent nothing usable. */
async function refusal(response: Response, fallback: string): Promise<string> {
  const payload: unknown = await response.json().catch(() => null);
  const data =
    typeof payload === "object" && payload !== null
      ? (payload as Record<string, unknown>)
      : {};
  return typeof data.error === "string" ? data.error : fallback;
}

/**
 * The avatar as a file the server will accept.
 *
 * `readAvatarFile` already produced a data URL at the stored size, so this is a
 * decode rather than a second conversion — the bytes crossing the wire are the
 * ones the preview is showing.
 */
async function avatarBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}

export async function saveProfile(draft: ProfileDraft): Promise<void> {
  if (draft.avatarUrl !== undefined) {
    const response = draft.avatarUrl
      ? await (async () => {
          const form = new FormData();
          form.append("file", await avatarBlob(draft.avatarUrl!), "avatar.webp");
          return fetch("/api/account/avatar", { method: "PUT", body: form });
        })()
      : await fetch("/api/account/avatar", { method: "DELETE" });

    if (!response.ok) {
      throw new Error(await refusal(response, "Foto profil gagal disimpan."));
    }
  }

  const response = await fetch("/api/account/profile", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ displayName: draft.name.trim() }),
  });

  if (!response.ok) {
    throw new Error(await refusal(response, "Profil gagal disimpan."));
  }
}

/**
 * The square an avatar is stored at.
 *
 * Big enough for a retina 64px circle, small enough that the whole thing is a
 * few tens of kilobytes — an avatar is never shown larger than a thumbnail, and
 * carrying a 4000px camera photo around to draw one is the difference between a
 * profile page that loads and one that thinks about it.
 */
export const AVATAR_SIZE = 256;

/** What a phone camera produces, with room to spare. */
export const AVATAR_MAX_BYTES = 12 * 1024 * 1024;

export type AvatarResult =
  | { ok: true; dataUrl: string }
  | { ok: false; error: string };

/**
 * Turns a picked file into the avatar that would actually be stored.
 *
 * Resized and centre-cropped here rather than on the way out, so the preview is
 * not a promise about what the upload will look like — it *is* the image, at the
 * size and crop it will be kept at. A preview that shows the original and a
 * server that crops it differently is how somebody ends up with their forehead
 * missing.
 *
 * Centre crop because that is where a face is in a photo somebody chose as their
 * portrait; anything cleverer needs a face detector and a way to disagree with
 * it.
 */
export async function readAvatarFile(file: File): Promise<AvatarResult> {
  if (!file.type.startsWith("image/")) {
    return { ok: false, error: "Berkas itu bukan gambar." };
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return {
      ok: false,
      error: `Gambar terlalu besar — maksimal ${Math.round(AVATAR_MAX_BYTES / 1024 / 1024)} MB.`,
    };
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // A file that claims to be an image and cannot be decoded is corrupt, or is
    // a format this browser does not read; either way there is nothing to crop.
    return { ok: false, error: "Gambar itu tidak bisa dibaca." };
  }

  try {
    const canvas = document.createElement("canvas");
    canvas.width = AVATAR_SIZE;
    canvas.height = AVATAR_SIZE;

    const context = canvas.getContext("2d");
    if (!context) return { ok: false, error: "Gambar gagal diproses." };

    // Cover: fill the square from the middle of the shorter side.
    const side = Math.min(bitmap.width, bitmap.height);
    context.drawImage(
      bitmap,
      (bitmap.width - side) / 2,
      (bitmap.height - side) / 2,
      side,
      side,
      0,
      0,
      AVATAR_SIZE,
      AVATAR_SIZE,
    );

    // A data URL rather than an object URL: this value is handed to the account
    // store and survives navigating away and back, which a URL tied to this
    // document's lifetime does not.
    return { ok: true, dataUrl: canvas.toDataURL("image/webp", 0.85) };
  } finally {
    bitmap.close();
  }
}

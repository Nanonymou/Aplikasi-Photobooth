import { getViewer } from "@/lib/api/authorize";
import { jsonError, readJsonBody } from "@/lib/api/http";
import { describeMe } from "@/lib/api/me";
import { updateOwnProfile } from "@/lib/db/user-profiles";

// `pg` opens TCP sockets, which the edge runtime cannot do.
export const runtime = "nodejs";

/** Long enough for a real name, short enough not to be a paragraph. */
const NAME_MAX = 120;
const URL_MAX = 2048;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * The signed-in user's own profile, role, and what that role may do.
 *
 * Composed from the same `describeMe` that answers `GET /api/me`, so the profile
 * screen and the app's bootstrap can never disagree about the same person. What
 * is different here is the audience: this address is about *editing* a profile,
 * so it insists on being signed in — a settings form has nothing to show a
 * visitor who is not.
 */
export async function GET(): Promise<Response> {
  const me = await describeMe();
  if (!me.profile) return jsonError(401, "Masuk dulu untuk melihat profil.");

  return Response.json(
    {
      profile: me.profile,
      role: me.role,
      permissions: me.permissions,
    },
    { headers: { "cache-control": "private, no-store" } },
  );
}

/**
 * Updates the caller's own profile.
 *
 * Only the display name and avatar. A request that names a `role` is refused
 * outright rather than quietly ignored: silently dropping it would let a caller
 * believe they had changed something they had not, and the attempt is worth
 * being explicit about — this is the exact shape of a privilege-escalation try.
 *
 * `null` clears a field; omitting it leaves the stored value alone. That
 * distinction is why the body is inspected key by key rather than spread.
 */
export async function PATCH(request: Request): Promise<Response> {
  const viewer = await getViewer();
  if (!viewer) return jsonError(401, "Masuk dulu untuk mengubah profil.");

  const body = await readJsonBody(request);
  if (!body.ok) return body.response;
  if (!isRecord(body.value)) return jsonError(400, "Body bukan objek JSON.");

  if ("role" in body.value || "permissions" in body.value) {
    return jsonError(
      403,
      "Peran tidak bisa diubah dari sini. Hubungi admin.",
    );
  }

  const patch: { displayName?: string | null; avatarUrl?: string | null } = {};

  if ("displayName" in body.value) {
    const name = body.value.displayName;
    if (name === null) {
      patch.displayName = null;
    } else if (typeof name !== "string") {
      return jsonError(400, "Nama tidak valid.");
    } else {
      const trimmed = name.trim();
      // The column rejects a blank string; treating it as "clear this" is what
      // the user means when they empty the field.
      if (trimmed === "") patch.displayName = null;
      else if (trimmed.length > NAME_MAX) {
        return jsonError(400, `Nama maksimal ${NAME_MAX} karakter.`);
      } else patch.displayName = trimmed;
    }
  }

  if ("avatarUrl" in body.value) {
    const url = body.value.avatarUrl;
    if (url === null || url === "") {
      patch.avatarUrl = null;
    } else if (
      typeof url !== "string" ||
      !url.startsWith("https://") ||
      url.length > URL_MAX
    ) {
      return jsonError(400, "URL avatar harus https dan wajar panjangnya.");
    } else patch.avatarUrl = url;
  }

  if (Object.keys(patch).length === 0) {
    return jsonError(400, "Tidak ada yang diubah.");
  }

  try {
    const profile = await updateOwnProfile(viewer.profile.id, patch);
    if (!profile) return jsonError(404, "Profil tidak ditemukan.");
    return Response.json({ profile });
  } catch (error) {
    console.error("PATCH /api/account/profile failed", error);
    return jsonError(500, "Profil gagal disimpan.");
  }
}

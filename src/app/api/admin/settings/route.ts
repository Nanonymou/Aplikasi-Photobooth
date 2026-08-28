import { withPermission } from "@/lib/api/authorize";
import { isJsonObject, jsonError, readJsonBody } from "@/lib/api/http";
import {
  getSettings,
  RETENTION_MAX,
  RETENTION_MIN,
  saveSettings,
} from "@/lib/db/app-settings";
import {
  EXPORT_QUALITY_OPTIONS,
  LANGUAGE_OPTIONS,
  type ExportQuality,
  type Language,
  type SystemSettings,
} from "@/lib/admin/settings";

// `pg` opens TCP sockets, which the edge runtime cannot do.
export const runtime = "nodejs";

const LANGUAGES = LANGUAGE_OPTIONS.map((option) => option.id);
const QUALITIES = EXPORT_QUALITY_OPTIONS.map((option) => option.id);

const MAX_BRAND_LENGTH = 80;

/** Every key the body must carry. */
const FIELDS = [
  "brandName",
  "language",
  "allowGuest",
  "guestRetentionDays",
  "exportQuality",
  "allowRegistration",
] as const;

const FLAGS = ["allowGuest", "allowRegistration"] as const;

/**
 * Fields the read returns that the write owns, and therefore ignores.
 *
 * The write demands a complete object, so the only way to change one knob is to
 * read, edit, and send back — and a read that returns two fields the write then
 * refuses makes that the one workflow the API forces you into and rejects.
 * Ignored rather than accepted: they are the server's to set, and a caller that
 * sends a different `updatedBy` is not going to get it.
 */
const SERVER_OWNED = ["updatedAt", "updatedBy"] as const;

type Parsed = { settings: SystemSettings } | { error: string };

/**
 * Reads a complete settings object out of the body.
 *
 * Strict on purpose, unlike the read filters elsewhere in the console: a query
 * string is a view and a bad one costs nothing, but this writes what the whole
 * installation runs on. A misspelled key silently ignored here is a setting an
 * admin believes they changed and did not.
 */
function parse(body: Record<string, unknown>): Parsed {
  const known: readonly string[] = [...FIELDS, ...SERVER_OWNED];
  const extra = Object.keys(body).filter((key) => !known.includes(key));
  if (extra.length > 0) {
    return { error: `Bidang tidak dikenal: ${extra.join(", ")}.` };
  }

  const missing = FIELDS.filter((field) => body[field] === undefined);
  if (missing.length > 0) {
    return { error: `Bidang wajib belum diisi: ${missing.join(", ")}.` };
  }

  const brandName = body.brandName;
  if (typeof brandName !== "string" || brandName.trim().length === 0) {
    return { error: "Nama brand wajib diisi." };
  }
  if (brandName.trim().length > MAX_BRAND_LENGTH) {
    return { error: `Nama brand melebihi ${MAX_BRAND_LENGTH} karakter.` };
  }

  if (!LANGUAGES.includes(body.language as Language)) {
    return { error: `Bahasa harus salah satu dari: ${LANGUAGES.join(", ")}.` };
  }

  if (!QUALITIES.includes(body.exportQuality as ExportQuality)) {
    return {
      error: `Kualitas ekspor harus salah satu dari: ${QUALITIES.join(", ")}.`,
    };
  }

  const retention = body.guestRetentionDays;
  if (
    typeof retention !== "number" ||
    !Number.isInteger(retention) ||
    retention < RETENTION_MIN ||
    retention > RETENTION_MAX
  ) {
    return {
      error: `Retensi tamu harus bilangan bulat ${RETENTION_MIN}–${RETENTION_MAX} hari.`,
    };
  }

  for (const flag of FLAGS) {
    if (typeof body[flag] !== "boolean") {
      return { error: `Bidang \`${flag}\` harus boolean.` };
    }
  }

  return {
    settings: {
      brandName: brandName.trim(),
      language: body.language as Language,
      allowGuest: body.allowGuest as boolean,
      guestRetentionDays: retention,
      exportQuality: body.exportQuality as ExportQuality,
      allowRegistration: body.allowRegistration as boolean,
    },
  };
}

/**
 * The installation's settings.
 *
 * Guarded like the write: these say how the booth treats guests and
 * registration, which is closer to policy than to public information, and the
 * handful of values a visitor legitimately needs — what the place is called —
 * belong in a narrower endpoint than "everything an admin can change".
 */
export const GET = withPermission("admin.settings.manage", async () => {
  try {
    return Response.json(
      { settings: await getSettings() },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    console.error("GET /api/admin/settings failed", error);
    return jsonError(500, "Pengaturan gagal dimuat.");
  }
});

/**
 * Replaces the settings wholesale.
 *
 * PUT rather than PATCH because the form submits every value it shows, and the
 * verb should say so: this is the new state of the settings, not a nudge to one
 * of them. The body must be complete — a missing key is refused rather than
 * treated as "leave it alone", so a client that forgets a field learns it here
 * instead of shipping a screen that silently cannot turn one knob.
 */
export const PUT = withPermission(
  "admin.settings.manage",
  async (viewer, request: Request) => {
    const body = await readJsonBody(request);
    if (!body.ok) return body.response;
    if (!isJsonObject(body.value)) return jsonError(400, "Body bukan objek.");

    const parsed = parse(body.value);
    if ("error" in parsed) return jsonError(400, parsed.error);

    try {
      const settings = await saveSettings(parsed.settings, viewer.profile.id);
      return Response.json(
        { settings },
        { headers: { "cache-control": "private, no-store" } },
      );
    } catch (error) {
      console.error("PUT /api/admin/settings failed", error);
      return jsonError(500, "Pengaturan gagal disimpan.");
    }
  },
);

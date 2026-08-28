import { withFeature } from "@/lib/api/features";
import { isJsonObject, jsonError, readJsonBody } from "@/lib/api/http";
import {
  getBranding,
  PIN_PATTERN,
  saveBranding,
  type BrandingUpdate,
} from "@/lib/db/event-branding";
import { ACCENT_OPTIONS, type AccentId } from "@/lib/admin/branding";

// `pg` opens TCP sockets, which the edge runtime cannot do.
export const runtime = "nodejs";

const ACCENTS = ACCENT_OPTIONS.map((option) => option.id);

const MAX_EVENT_NAME = 120;
const MAX_TAGLINE = 200;

const FIELDS = ["eventName", "tagline", "accent", "pin"];

type Parsed = { update: BrandingUpdate } | { error: string };

function parse(body: Record<string, unknown>): Parsed {
  const extra = Object.keys(body).filter((key) => !FIELDS.includes(key));
  if (extra.length > 0) {
    return { error: `Bidang tidak dikenal: ${extra.join(", ")}.` };
  }

  const eventName = body.eventName;
  if (typeof eventName !== "string" || eventName.trim().length === 0) {
    return { error: "Nama acara wajib diisi." };
  }
  if (eventName.trim().length > MAX_EVENT_NAME) {
    return { error: `Nama acara melebihi ${MAX_EVENT_NAME} karakter.` };
  }

  const tagline = body.tagline;
  if (typeof tagline !== "string" || tagline.trim().length === 0) {
    return { error: "Kalimat sambutan wajib diisi." };
  }
  if (tagline.trim().length > MAX_TAGLINE) {
    return { error: `Kalimat sambutan melebihi ${MAX_TAGLINE} karakter.` };
  }

  if (!ACCENTS.includes(body.accent as AccentId)) {
    return { error: `Warna aksen harus salah satu dari: ${ACCENTS.join(", ")}.` };
  }

  const update: BrandingUpdate = {
    eventName: eventName.trim(),
    tagline: tagline.trim(),
    accent: body.accent as AccentId,
  };

  // Same three meanings as the kiosk's own setup: set, clear, or leave alone.
  if ("pin" in body) {
    const pin = body.pin;
    if (pin !== null && (typeof pin !== "string" || !PIN_PATTERN.test(pin))) {
      return { error: "PIN harus 4 digit angka, atau null untuk menghapusnya." };
    }
    update.pin = pin;
  }

  return { update };
}

/**
 * The event's branding.
 *
 * The same row the kiosk reads — the console and the booth are two editors of
 * one set of values, not two settings that happen to look alike. Which is the
 * whole point: an organizer renaming the event at the booth and an admin
 * renaming it in the console must not end up each convinced they had.
 *
 * The exit PIN is reported only as `pinSet`. This screen is a form an admin
 * types into, not a place to read a secret back out of, and the value itself
 * has no reason to travel to a browser at all.
 */
export const GET = withFeature("event.branding", async () => {
  try {
    return Response.json(
      { branding: await getBranding() },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    console.error("GET /api/admin/branding failed", error);
    return jsonError(500, "Branding gagal dimuat.");
  }
});

/**
 * Saves the branding.
 *
 * Accent is required here, unlike on the kiosk's setup endpoint, because this
 * form shows a colour picker: a body without it is a client that lost a field,
 * not one that had nothing to say about it.
 */
export const PUT = withFeature(
  "event.branding",
  async (context, request: Request) => {
    const body = await readJsonBody(request);
    if (!body.ok) return body.response;
    if (!isJsonObject(body.value)) return jsonError(400, "Body bukan objek.");

    const parsed = parse(body.value);
    if ("error" in parsed) return jsonError(400, parsed.error);

    const actor = context.viewer;
    if (!actor) return jsonError(401, "Masuk dulu untuk melanjutkan.");

    try {
      const branding = await saveBranding(parsed.update, actor.profile.id);
      return Response.json(
        { branding },
        { headers: { "cache-control": "private, no-store" } },
      );
    } catch (error) {
      console.error("PUT /api/admin/branding failed", error);
      return jsonError(500, "Branding gagal disimpan.");
    }
  },
);

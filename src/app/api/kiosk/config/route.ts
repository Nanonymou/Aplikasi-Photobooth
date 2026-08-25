import { withFeature } from "@/lib/api/features";
import { jsonError, readJsonBody } from "@/lib/api/http";
import {
  getKioskConfig,
  PIN_PATTERN,
  saveBranding,
  type BrandingUpdate,
} from "@/lib/db/event-branding";

// `pg` opens TCP sockets, which the edge runtime cannot do.
export const runtime = "nodejs";

const MAX_EVENT_NAME = 120;
const MAX_TAGLINE = 200;

const FIELDS = ["eventName", "tagline", "pin"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

type Parsed = { update: BrandingUpdate } | { error: string };

/**
 * Reads the organizer's kiosk setup out of the body.
 *
 * `pin` has three meanings and all three are needed: a string sets it, `null`
 * removes it, and leaving the key out entirely keeps the one already stored.
 * That last case is the common one — an organizer fixing a typo in the event
 * name should not have to retype the PIN, and should certainly not wipe it by
 * omission.
 */
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

  const update: BrandingUpdate = {
    eventName: eventName.trim(),
    tagline: tagline.trim(),
  };

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
 * What the kiosk screen shows.
 *
 * The PIN is not in the answer, and there is no query string that will produce
 * it. Kiosk mode runs on a device pointed at a crowd with the organizer's
 * session already signed in; anything this endpoint returns is one devtools
 * panel away from a guest, so the exit secret is checked on the server
 * (`POST /api/kiosk/unlock`) rather than shipped for the client to compare.
 * `pinSet` is all the screen needs — enough to know whether to offer the pad.
 */
export const GET = withFeature("booth.kiosk", async () => {
  try {
    return Response.json(
      { config: await getKioskConfig() },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    console.error("GET /api/kiosk/config failed", error);
    return jsonError(500, "Pengaturan kiosk gagal dimuat.");
  }
});

/**
 * Sets up the booth: the event's name, its welcome line, and the exit PIN.
 *
 * The same row the console's branding page edits, minus the accent — the kiosk
 * setup screen shows no colour picker, and a field an editor cannot see is one
 * it has no business overwriting.
 */
export const PUT = withFeature(
  "booth.kiosk",
  async (context, request: Request) => {
    const body = await readJsonBody(request);
    if (!body.ok) return body.response;
    if (!isRecord(body.value)) return jsonError(400, "Body bukan objek.");

    const parsed = parse(body.value);
    if ("error" in parsed) return jsonError(400, parsed.error);

    // Unreachable while the feature requires a permission — a permission needs a
    // viewer — but stated rather than asserted, so a future feature without one
    // fails here instead of writing `undefined` into the audit column.
    const actor = context.viewer;
    if (!actor) return jsonError(401, "Masuk dulu untuk melanjutkan.");

    try {
      await saveBranding(parsed.update, actor.profile.id);
      return Response.json(
        { config: await getKioskConfig() },
        { headers: { "cache-control": "private, no-store" } },
      );
    } catch (error) {
      console.error("PUT /api/kiosk/config failed", error);
      return jsonError(500, "Pengaturan kiosk gagal disimpan.");
    }
  },
);

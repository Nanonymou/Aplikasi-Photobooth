/**
 * Event branding, on the browser's side.
 *
 * The face the booth wears — the event's name, its welcome line, an accent
 * colour, and the PIN that unlocks kiosk mode. The kiosk and the live slideshow
 * read the same row, so this is not the console's private copy of anything: two
 * editors, one set of values.
 *
 * The PIN is the exception, and the shape here says so. It goes *out* as part of
 * an update and never comes back — the form is a place to set a secret, not a
 * place to read one.
 */

export type AccentId = "violet" | "blue" | "emerald" | "rose" | "amber";

export const ACCENT_OPTIONS: { id: AccentId; label: string; color: string }[] = [
  { id: "violet", label: "Ungu", color: "#8b5cf6" },
  { id: "blue", label: "Biru", color: "#3b82f6" },
  { id: "emerald", label: "Hijau", color: "#10b981" },
  { id: "rose", label: "Merah muda", color: "#f43f5e" },
  { id: "amber", label: "Kuning", color: "#f59e0b" },
];

export function accentColor(id: AccentId): string {
  return ACCENT_OPTIONS.find((option) => option.id === id)?.color ?? "#8b5cf6";
}

/** Mirrors the server's limits, so the form catches what the route would. */
export const MAX_EVENT_NAME = 120;
export const MAX_TAGLINE = 200;
export const PIN_LENGTH = 4;

/** What the form edits — the copy and the colour. The PIN is handled apart. */
export interface BrandingFields {
  eventName: string;
  tagline: string;
  accent: AccentId;
}

/** What the screen is told about the stored row. */
export interface BrandingState extends BrandingFields {
  /** Whether an exit PIN exists. Never the PIN itself. */
  pinSet: boolean;
  updatedAt: string;
  /** Display name of whoever last saved, when it can be resolved. */
  updatedBy: string | null;
}

/**
 * What to do with the PIN on a save.
 *
 * Three intentions the API distinguishes and a single optional string would
 * collapse into two: `keep` leaves the stored one alone (the common case — an
 * admin fixing a typo in the event name must not wipe the PIN by omission),
 * `set` replaces it, `clear` removes it.
 */
export type PinIntent =
  | { kind: "keep" }
  | { kind: "set"; pin: string }
  | { kind: "clear" };

export function isValidPin(pin: string): boolean {
  return new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin);
}

/** The first thing wrong with the copy, or null. Same order the route checks. */
export function fieldProblem(fields: BrandingFields): string | null {
  if (fields.eventName.trim().length === 0) return "Nama acara wajib diisi.";
  if (fields.eventName.trim().length > MAX_EVENT_NAME) {
    return `Nama acara melebihi ${MAX_EVENT_NAME} karakter.`;
  }
  if (fields.tagline.trim().length === 0) return "Kalimat sambutan wajib diisi.";
  if (fields.tagline.trim().length > MAX_TAGLINE) {
    return `Kalimat sambutan melebihi ${MAX_TAGLINE} karakter.`;
  }
  return null;
}

export type SaveResult =
  | { ok: true; branding: Omit<BrandingState, "updatedBy"> }
  | { ok: false; message: string };

/** Writes the branding. `pin` is left out entirely unless the intent says so. */
export async function saveBranding(
  fields: BrandingFields,
  pin: PinIntent,
): Promise<SaveResult> {
  const body: Record<string, unknown> = {
    eventName: fields.eventName.trim(),
    tagline: fields.tagline.trim(),
    accent: fields.accent,
  };

  if (pin.kind === "set") body.pin = pin.pin;
  else if (pin.kind === "clear") body.pin = null;

  let response: Response;
  try {
    response = await fetch("/api/admin/branding", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, message: "Tidak bisa menghubungi server." };
  }

  const payload: unknown = await response.json().catch(() => null);
  const details =
    typeof payload === "object" && payload !== null
      ? (payload as Record<string, unknown>)
      : {};

  if (!response.ok) {
    return {
      ok: false,
      message:
        typeof details.error === "string"
          ? details.error
          : "Branding gagal disimpan.",
    };
  }

  return {
    ok: true,
    branding: details.branding as Omit<BrandingState, "updatedBy">,
  };
}

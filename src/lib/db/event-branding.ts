import "server-only";

import { query } from "@/lib/db/client";
import { getSettings } from "@/lib/db/app-settings";
import { hashPin, verifyPin } from "@/lib/auth/pin";
import type { AccentId } from "@/lib/admin/branding";

/**
 * The face the booth wears, and the one thing it will not show.
 *
 * One row behind two screens: the admin console edits it as "branding", the
 * organizer at the booth edits the same values as "kiosk setup", and the kiosk
 * and slideshow read it. The event name, tagline, and accent are copy — they go
 * to a screen facing a crowd. The PIN is the opposite: it exists so the crowd
 * cannot leave kiosk mode, so it never leaves this module. Callers get to ask
 * "is this PIN right?" and nothing else.
 */

/** What both editors see: the copy, the accent, and whether a PIN exists. */
export interface EventBranding {
  eventName: string;
  tagline: string;
  accent: AccentId;
  /** Whether an exit PIN has been set at all. Never the PIN itself. */
  pinSet: boolean;
  updatedAt: string;
  updatedBy: string | null;
}

/** The branding plus the product name, as the kiosk screen needs it. */
export interface KioskConfig extends EventBranding {
  /** Shared with the rest of the app; the booth does not keep its own copy. */
  brandName: string;
}

interface BrandingRow {
  event_name: string;
  tagline: string;
  accent: AccentId;
  pin_hash: string | null;
  updated_at: Date;
  updated_by: string | null;
}

/** How long a PIN may be. Four digits is what the pad on screen offers. */
export const PIN_LENGTH = 4;
export const PIN_PATTERN = /^\d{4}$/;

async function readRow(): Promise<BrandingRow | null> {
  const rows = await query<BrandingRow>("select * from event_branding where id");
  return rows[0] ?? null;
}

/** What an unconfigured booth looks like; also the migration's own defaults. */
const UNCONFIGURED: EventBranding = {
  eventName: "Photobooth",
  tagline: "Bergaya, jepret, dan bawa pulang kenangannya.",
  accent: "violet",
  pinSet: false,
  updatedAt: new Date(0).toISOString(),
  updatedBy: null,
};

function toBranding(row: BrandingRow): EventBranding {
  return {
    eventName: row.event_name,
    tagline: row.tagline,
    accent: row.accent,
    pinSet: row.pin_hash !== null,
    updatedAt: row.updated_at.toISOString(),
    updatedBy: row.updated_by,
  };
}

/** The branding on its own — what the console's branding form loads. */
export async function getBranding(): Promise<EventBranding> {
  const row = await readRow();

  if (!row) {
    console.error("event_branding row is missing; serving an unconfigured booth");
    return UNCONFIGURED;
  }

  return toBranding(row);
}

/**
 * The kiosk's configuration, safe to send to a screen.
 *
 * The brand name is read from the installation's settings rather than stored
 * here, so renaming the product renames it on the kiosk too — one name, one
 * place to change it.
 */
export async function getKioskConfig(): Promise<KioskConfig> {
  const [branding, settings] = await Promise.all([getBranding(), getSettings()]);
  return { ...branding, brandName: settings.brandName };
}

export interface BrandingUpdate {
  eventName: string;
  tagline: string;
  /**
   * Left out by the kiosk's own setup screen, which does not offer it — the
   * accent is the console's to choose, and an editor that cannot show a colour
   * should not be able to change it by omission.
   */
  accent?: AccentId;
  /**
   * A new PIN, a `null` to remove the one that is set, or `undefined` to leave
   * it alone — three different intentions that a single optional string would
   * collapse into two.
   */
  pin?: string | null;
}

/**
 * Writes the copy, and the accent and PIN only when the caller mentioned them.
 *
 * Both editors submit the fields they show and no others, so anything absent
 * has to survive the write. An admin restyling the console must not silently
 * clear the PIN an organizer set at the booth, and an organizer fixing the
 * event name must not reset the accent to whatever the default happened to be.
 */
export async function saveBranding(
  update: BrandingUpdate,
  updatedBy: string,
): Promise<EventBranding> {
  const changingPin = update.pin !== undefined;
  const hash = update.pin ? await hashPin(update.pin) : null;

  await query(
    `update event_branding
        set event_name = $1,
            tagline = $2,
            accent = coalesce($3, accent),
            pin_hash = case when $4::boolean then $5 else pin_hash end,
            updated_by = $6
      where id`,
    [
      update.eventName.trim(),
      update.tagline.trim(),
      update.accent ?? null,
      changingPin,
      hash,
      updatedBy,
    ],
  );

  return getBranding();
}

/**
 * Checks the organizer's PIN.
 *
 * An unset PIN fails every check. Treating "no PIN configured" as "any PIN
 * opens it" would make an unconfigured booth the easiest one to walk out of,
 * which is precisely backwards.
 */
export async function checkExitPin(pin: string): Promise<boolean> {
  const row = await readRow();
  if (!row?.pin_hash) return false;
  return verifyPin(pin, row.pin_hash);
}

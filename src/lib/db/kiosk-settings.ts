import "server-only";

import { query } from "@/lib/db/client";
import { getSettings } from "@/lib/db/app-settings";
import { hashPin, verifyPin } from "@/lib/auth/pin";

/**
 * What kiosk mode shows, and what it will not show.
 *
 * The event name and tagline are copy: they go to the screen, and the screen is
 * facing a crowd. The PIN is the opposite — it exists so the crowd cannot leave
 * kiosk mode — so it never leaves this module. Callers get to ask "is this PIN
 * right?" and nothing else.
 */

export interface KioskConfig {
  eventName: string;
  tagline: string;
  /** Shared with the rest of the app; kiosk does not keep its own copy. */
  brandName: string;
  /** Whether an exit PIN has been set at all. */
  pinSet: boolean;
  updatedAt: string;
  updatedBy: string | null;
}

interface KioskRow {
  event_name: string;
  tagline: string;
  pin_hash: string | null;
  updated_at: Date;
  updated_by: string | null;
}

/** How long a PIN may be. Four digits is what the pad on screen offers. */
export const PIN_LENGTH = 4;
export const PIN_PATTERN = /^\d{4}$/;

async function readRow(): Promise<KioskRow | null> {
  const rows = await query<KioskRow>("select * from kiosk_settings where id");
  return rows[0] ?? null;
}

/**
 * The kiosk's configuration, safe to send to a screen.
 *
 * The brand name is read from the installation's settings rather than stored
 * here, so renaming the product renames it on the kiosk too — one name, one
 * place to change it.
 */
export async function getKioskConfig(): Promise<KioskConfig> {
  const [row, settings] = await Promise.all([readRow(), getSettings()]);

  if (!row) {
    console.error("kiosk_settings row is missing; serving an unconfigured kiosk");
    return {
      eventName: "Photobooth",
      tagline: "Bergaya, jepret, dan bawa pulang kenangannya.",
      brandName: settings.brandName,
      pinSet: false,
      updatedAt: new Date(0).toISOString(),
      updatedBy: null,
    };
  }

  return {
    eventName: row.event_name,
    tagline: row.tagline,
    brandName: settings.brandName,
    pinSet: row.pin_hash !== null,
    updatedAt: row.updated_at.toISOString(),
    updatedBy: row.updated_by,
  };
}

export interface KioskUpdate {
  eventName: string;
  tagline: string;
  /**
   * A new PIN, a `null` to remove the one that is set, or `undefined` to leave
   * it alone — three different intentions that a single optional string would
   * collapse into two.
   */
  pin?: string | null;
}

/** Writes the copy, and the PIN only when the caller said something about it. */
export async function saveKioskConfig(
  update: KioskUpdate,
  updatedBy: string,
): Promise<KioskConfig> {
  const changingPin = update.pin !== undefined;
  const hash = update.pin ? await hashPin(update.pin) : null;

  await query(
    `update kiosk_settings
        set event_name = $1,
            tagline = $2,
            pin_hash = case when $3::boolean then $4 else pin_hash end,
            updated_by = $5
      where id`,
    [update.eventName.trim(), update.tagline.trim(), changingPin, hash, updatedBy],
  );

  return getKioskConfig();
}

/**
 * Checks the organizer's PIN.
 *
 * An unset PIN fails every check. Treating "no PIN configured" as "any PIN
 * opens it" would make an unconfigured booth the easiest one to walk out of,
 * which is precisely backwards.
 */
export async function checkKioskPin(pin: string): Promise<boolean> {
  const row = await readRow();
  if (!row?.pin_hash) return false;
  return verifyPin(pin, row.pin_hash);
}

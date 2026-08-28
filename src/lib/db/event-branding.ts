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
  active_event_id: string | null;
}

/** The live event's own branding, when the booth is running one. */
interface ActiveEventRow {
  id: string;
  name: string;
  tagline: string;
  accent: AccentId;
  pin_hash: string | null;
  updated_at: Date;
  created_by: string | null;
}

/**
 * The event the booth is running, or null.
 *
 * One join rather than two round trips, because every caller that wants the
 * branding wants this first — and a settings row that says "event X" followed by
 * a second query that finds X deleted is a window the booth would show the wrong
 * name through.
 */
async function readActiveEvent(): Promise<ActiveEventRow | null> {
  const rows = await query<ActiveEventRow>(
    `select e.id, e.name, e.tagline, e.accent, e.pin_hash, e.updated_at, e.created_by
       from event_branding b
       join events e on e.id = b.active_event_id
      where b.id`,
  );
  return rows[0] ?? null;
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
/**
 * The branding the booth should be wearing.
 *
 * The live event's, when there is one — that is the whole point of an event
 * having a name. The settings row's own copy is the fallback for a booth that
 * has never had an event created on it, which still has to have a face.
 *
 * The live event is the authority while it is live, including about its PIN: an
 * event nobody set a PIN on has no PIN, and quietly inheriting the installation's
 * would make `pinSet` a lie and hand Saturday's organizer the key to Sunday.
 */
export async function getBranding(): Promise<EventBranding> {
  const [row, event] = await Promise.all([readRow(), readActiveEvent()]);

  if (event) {
    return {
      eventName: event.name,
      tagline: event.tagline,
      accent: event.accent,
      pinSet: event.pin_hash !== null,
      updatedAt: event.updated_at.toISOString(),
      updatedBy: event.created_by,
    };
  }

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
 *
 * It writes wherever the booth is currently reading: the live event when there
 * is one, the settings row when there is not. Anything else and the branding
 * form would be editing something the booth is not showing — an admin renaming
 * the event, watching the kiosk keep the old name, and having no way to tell why.
 */
export async function saveBranding(
  update: BrandingUpdate,
  updatedBy: string,
): Promise<EventBranding> {
  const changingPin = update.pin !== undefined;
  const hash = update.pin ? await hashPin(update.pin) : null;

  const event = await readActiveEvent();

  if (event) {
    await query(
      `update events
          set name = $1,
              tagline = $2,
              accent = coalesce($3, accent),
              pin_hash = case when $4::boolean then $5 else pin_hash end
        where id = $6`,
      [
        update.eventName.trim(),
        update.tagline.trim(),
        update.accent ?? null,
        changingPin,
        hash,
        event.id,
      ],
    );
    return getBranding();
  }

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
  // The live event answers for itself, PIN or no PIN. Falling back to the
  // installation's would let an event nobody set a PIN on be opened with the
  // one from a different night — which is exactly what per-event PINs exist to
  // prevent.
  const event = await readActiveEvent();
  if (event) {
    return event.pin_hash ? verifyPin(pin, event.pin_hash) : false;
  }

  const row = await readRow();
  if (!row?.pin_hash) return false;
  return verifyPin(pin, row.pin_hash);
}

/** The id of the event the booth is running, or null. */
export async function activeEventId(): Promise<string | null> {
  const rows = await query<{ active_event_id: string | null }>(
    "select active_event_id from event_branding where id",
  );
  return rows[0]?.active_event_id ?? null;
}

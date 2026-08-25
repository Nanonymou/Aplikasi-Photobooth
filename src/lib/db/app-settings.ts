import "server-only";

import { query } from "@/lib/db/client";
import {
  DEFAULT_SETTINGS,
  RETENTION_MAX,
  RETENTION_MIN,
  type ExportQuality,
  type Language,
  type SystemSettings,
} from "@/lib/admin/settings";

/**
 * The installation's own settings.
 *
 * One row, always present — the migration inserts it — so every read here is a
 * hit and there is no "not configured yet" state for callers to handle. The
 * shape is the same `SystemSettings` the settings form already speaks, because
 * a second vocabulary for the same eight knobs is how a checkbox ends up
 * meaning one thing in the form and another in the database.
 */

export interface StoredSettings extends SystemSettings {
  updatedAt: string;
  updatedBy: string | null;
}

interface SettingsRow {
  brand_name: string;
  language: Language;
  allow_guest: boolean;
  guest_retention_days: number;
  export_quality: ExportQuality;
  require_email_verification: boolean;
  allow_registration: boolean;
  admin_two_factor: boolean;
  updated_at: Date;
  updated_by: string | null;
}

function toSettings(row: SettingsRow): StoredSettings {
  return {
    brandName: row.brand_name,
    language: row.language,
    allowGuest: row.allow_guest,
    guestRetentionDays: row.guest_retention_days,
    exportQuality: row.export_quality,
    requireEmailVerification: row.require_email_verification,
    allowRegistration: row.allow_registration,
    adminTwoFactor: row.admin_two_factor,
    updatedAt: row.updated_at.toISOString(),
    updatedBy: row.updated_by,
  };
}

/**
 * The current settings.
 *
 * Falls back to the compiled defaults if the row is somehow missing — a booth
 * whose settings row was deleted should still open, with the same values a
 * fresh install would have had, rather than failing every request that asks
 * what the place is called.
 */
export async function getSettings(): Promise<StoredSettings> {
  const rows = await query<SettingsRow>("select * from app_settings where id");

  if (!rows[0]) {
    console.error("app_settings row is missing; serving compiled defaults");
    return { ...DEFAULT_SETTINGS, updatedAt: new Date(0).toISOString(), updatedBy: null };
  }

  return toSettings(rows[0]);
}

/**
 * Writes all eight knobs at once.
 *
 * A whole-object write, matching the form: the settings screen shows every value
 * and saves what it shows, so a partial update would mean the server guessing
 * which unmentioned fields were left alone and which were cleared. Two admins
 * saving at once therefore resolves to last-write-wins, which is the honest
 * outcome for a screen that always submits a complete picture — `updatedAt`
 * comes back so a caller that cares can notice it moved.
 */
export async function saveSettings(
  settings: SystemSettings,
  updatedBy: string,
): Promise<StoredSettings> {
  const rows = await query<SettingsRow>(
    `update app_settings
        set brand_name = $1,
            language = $2,
            allow_guest = $3,
            guest_retention_days = $4,
            export_quality = $5,
            require_email_verification = $6,
            allow_registration = $7,
            admin_two_factor = $8,
            updated_by = $9
      where id
     returning *`,
    [
      settings.brandName.trim(),
      settings.language,
      settings.allowGuest,
      settings.guestRetentionDays,
      settings.exportQuality,
      settings.requireEmailVerification,
      settings.allowRegistration,
      settings.adminTwoFactor,
      updatedBy,
    ],
  );

  return toSettings(rows[0]);
}

/** Bounds re-exported so a validator does not restate what the slider offers. */
export { RETENTION_MAX, RETENTION_MIN };

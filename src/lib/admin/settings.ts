/**
 * System settings.
 *
 * Stand-in for `GET/PUT /api/admin/settings` — the booth-wide knobs an admin
 * controls. `DEFAULT_SETTINGS` is what the loader returns today; `saveSettings`
 * imitates the write (a pause, no persistence) so the form's dirty → saving →
 * saved flow is real ahead of the endpoint. When it lands these two are the only
 * things that change.
 */

export type Language = "id" | "en";
export type ExportQuality = "standard" | "high" | "max";

export interface SystemSettings {
  brandName: string;
  language: Language;
  allowGuest: boolean;
  guestRetentionDays: number;
  exportQuality: ExportQuality;
  requireEmailVerification: boolean;
  allowRegistration: boolean;
  adminTwoFactor: boolean;
}

export const DEFAULT_SETTINGS: SystemSettings = {
  brandName: "FrameStudio",
  language: "id",
  allowGuest: true,
  guestRetentionDays: 30,
  exportQuality: "high",
  requireEmailVerification: true,
  allowRegistration: true,
  adminTwoFactor: false,
};

export const LANGUAGE_OPTIONS: { id: Language; label: string }[] = [
  { id: "id", label: "Indonesia" },
  { id: "en", label: "English" },
];

export const EXPORT_QUALITY_OPTIONS: { id: ExportQuality; label: string }[] = [
  { id: "standard", label: "Standar" },
  { id: "high", label: "Tinggi" },
  { id: "max", label: "Maksimal" },
];

/** Bounds for the guest-retention slider, in days. */
export const RETENTION_MIN = 7;
export const RETENTION_MAX = 90;

const SAVE_LATENCY_MS = 700;

export async function saveSettings(settings: SystemSettings): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, SAVE_LATENCY_MS));
  void settings;
}

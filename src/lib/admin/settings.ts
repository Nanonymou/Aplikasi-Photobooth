/**
 * System settings.
 *
 * The booth-wide knobs an admin controls, shared by the form and the endpoint so
 * one checkbox cannot mean two things.
 *
 * Every knob here is enforced somewhere. That is a rule, not a description: a
 * setting an admin can change and nothing reads is worse than no setting at all,
 * because it reports success and changes nothing. Two of them —
 * "wajib verifikasi email" and "2FA admin" — were exactly that and have been
 * removed (migration 0037) rather than left looking operational.
 *
 * `saveSettings` below still imitates the write for the form; the endpoint at
 * `PUT /api/admin/settings` is the real one.
 */

export type Language = "id" | "en";
export type ExportQuality = "standard" | "high" | "max";

export interface SystemSettings {
  brandName: string;
  language: Language;
  allowGuest: boolean;
  guestRetentionDays: number;
  exportQuality: ExportQuality;
  allowRegistration: boolean;
}

export const DEFAULT_SETTINGS: SystemSettings = {
  brandName: "FrameStudio",
  language: "id",
  allowGuest: true,
  guestRetentionDays: 30,
  exportQuality: "high",
  allowRegistration: true,
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

/**
 * Bounds for the guest-retention slider, in days.
 *
 * What the slider offers is what the booth actually forgets on: the value is
 * read when a guest session and each photo are recorded, so moving it changes
 * the expiry of everything saved after it.
 */
export const RETENTION_MIN = 7;
export const RETENTION_MAX = 90;

/**
 * The longest edge an export may be rendered at, per quality.
 *
 * The knob has to cost something or it is decoration. Standard keeps a booth on
 * a modest machine responsive; max is for the operator who is printing.
 */
export const EXPORT_MAX_EDGE: Record<ExportQuality, number> = {
  standard: 2000,
  high: 4000,
  max: 8000,
};

const SAVE_LATENCY_MS = 700;

export async function saveSettings(settings: SystemSettings): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, SAVE_LATENCY_MS));
  void settings;
}

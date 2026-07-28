/**
 * Event branding.
 *
 * What the organizer sets so the booth wears the event's face — the name, the
 * welcome line, an accent colour, and the PIN that unlocks kiosk mode. The kiosk
 * and the live slideshow read these. Stand-in for `GET/PUT /api/admin/branding`;
 * `saveBranding` imitates the write so the form's dirty → saving → saved flow is
 * real before the endpoint exists.
 */

export interface EventBranding {
  eventName: string;
  tagline: string;
  accent: AccentId;
  /** 4-digit PIN to leave kiosk mode; the organizer keeps it. */
  exitPin: string;
}

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

export const DEFAULT_BRANDING: EventBranding = {
  eventName: "Pernikahan Dewi & Rangga",
  tagline: "Bergaya, jepret, dan bawa pulang kenangannya.",
  accent: "violet",
  exitPin: "2468",
};

export const PIN_LENGTH = 4;

/** A 4-digit PIN — the only field with a rule worth blocking a save over. */
export function isValidPin(pin: string): boolean {
  return new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin);
}

const SAVE_LATENCY_MS = 700;

export async function saveBranding(branding: EventBranding): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, SAVE_LATENCY_MS));
  void branding;
}

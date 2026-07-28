/**
 * Kiosk configuration.
 *
 * What the organizer sets when they hand a booth to the crowd: the event's name,
 * a line of welcome, and the PIN that unlocks the exit so a guest cannot wander
 * out of kiosk mode. Stand-in for the org's saved kiosk settings — the real
 * source replaces these constants without moving the screen.
 */

export interface KioskConfig {
  eventName: string;
  tagline: string;
  brandName: string;
  /** The organizer's PIN to leave kiosk mode; guests never have it. */
  exitPin: string;
}

export const KIOSK_CONFIG: KioskConfig = {
  eventName: "Pernikahan Dewi & Rangga",
  tagline: "Bergaya, jepret, dan bawa pulang kenangannya.",
  brandName: "FrameStudio",
  exitPin: "2468",
};

export const PIN_LENGTH = 4;

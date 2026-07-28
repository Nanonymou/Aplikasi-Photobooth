import { DEMO_SHOT_SOURCES } from "@/lib/camera/demo-shots";

/**
 * The live slideshow feed.
 *
 * Stand-in for the stream of photos guests share at an event — what the organizer
 * projects on a big screen. Each entry is one shared frame with who it is from and
 * how long ago, reusing the sample images the camera demo already ships so there
 * is nothing new to load. The real feed (newest shares first, growing during the
 * event) replaces this constant without moving the screen.
 */

export interface SlideItem {
  id: string;
  src: string;
  guest: string;
  /** Pre-formatted relative time, so there is no clock to hydrate. */
  at: string;
}

function sample(index: number): string {
  return DEMO_SHOT_SOURCES[index % DEMO_SHOT_SOURCES.length];
}

export const SLIDESHOW_ITEMS: SlideItem[] = [
  { id: "s1", src: sample(0), guest: "Dewi & Rangga", at: "baru saja" },
  { id: "s2", src: sample(1), guest: "Keluarga Besar", at: "1 menit lalu" },
  { id: "s3", src: sample(2), guest: "Sahabat SMA", at: "2 menit lalu" },
  { id: "s4", src: sample(0), guest: "Tim Kantor", at: "4 menit lalu" },
  { id: "s5", src: sample(1), guest: "Geng Arisan", at: "6 menit lalu" },
  { id: "s6", src: sample(2), guest: "Oma & Opa", at: "9 menit lalu" },
  { id: "s7", src: sample(0), guest: "Pengiring Pengantin", at: "12 menit lalu" },
  { id: "s8", src: sample(1), guest: "Teman Kuliah", at: "15 menit lalu" },
];

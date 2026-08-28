"use client";

/**
 * The live slideshow's feed.
 *
 * The stream of photos guests shared at this event, newest first, from
 * `GET /api/slideshow/feed`. It was a constant reusing the camera demo's sample
 * images, which meant the wall at a real event showed the same five stock frames
 * all night.
 *
 * The image is the share link itself — `/s/<code>` serves the file and enforces
 * the share's own expiry and revocation, so a photo a guest took down stops
 * appearing on the wall without the slideshow needing to know why.
 */

export interface SlideItem {
  id: string;
  src: string;
  guest: string;
  /** ISO; the screen formats it against its own clock. */
  createdAt: string;
}

interface ApiSlide {
  id: string;
  guest: string;
  createdAt: string;
}

export interface SlideFeed {
  slides: SlideItem[];
  /**
   * The server's clock at the moment it answered.
   *
   * Passed back on the next poll so "what is new since then" is measured by one
   * clock. A wall left running for six hours against a laptop whose clock drifts
   * would otherwise start missing photos, or repeating them.
   */
  serverTime: string;
}

export async function fetchSlides(since?: string): Promise<SlideFeed> {
  const params = since ? `?since=${encodeURIComponent(since)}` : "";
  const response = await fetch(`/api/slideshow/feed${params}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null);
    const data =
      typeof payload === "object" && payload !== null
        ? (payload as Record<string, unknown>)
        : {};
    throw new Error(
      typeof data.error === "string" ? data.error : "Foto gagal dimuat.",
    );
  }

  const api = (await response.json()) as {
    slides: ApiSlide[];
    serverTime: string;
  };

  return {
    serverTime: api.serverTime,
    slides: api.slides.map((slide) => ({
      id: slide.id,
      src: `/s/${slide.id}`,
      guest: slide.guest,
      createdAt: slide.createdAt,
    })),
  };
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/** "2 menit lalu", for the caption under a photo on the wall. */
export function relativeTime(iso: string): string {
  const elapsed = Date.now() - new Date(iso).getTime();
  if (elapsed < MINUTE) return "baru saja";
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)} menit lalu`;
  return `${Math.floor(elapsed / HOUR)} jam lalu`;
}

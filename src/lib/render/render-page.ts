import "server-only";

import sharp from "sharp";

import { renderPageSvg, type PhotoResolver } from "@/lib/render/page-svg";
import { identifyImage } from "@/lib/api/image-file";
import { getPhotoStorage, isValidKey } from "@/lib/storage/photo-storage";
import type { CanvasPage } from "@/types/editor";

/**
 * Rasterises a page at print resolution.
 *
 * The scale is applied by rendering the SVG at the larger size rather than by
 * enlarging a small raster: vector text and shapes stay sharp at 300 DPI, which
 * is the entire point of a high-resolution export.
 */

/** Same ladder the editor's export dialog offers, where 1× is 72 DPI. */
export const MIN_SCALE = 0.5;
export const MAX_SCALE = 8;

/** Above this the render is minutes of CPU and hundreds of MB; refuse instead. */
export const MAX_OUTPUT_PIXELS = 80_000_000;

export class RenderTooLargeError extends Error {
  constructor(pixels: number) {
    super(
      `Ukuran hasil ${Math.round(pixels / 1_000_000)} MP melebihi batas ${MAX_OUTPUT_PIXELS / 1_000_000} MP.`,
    );
    this.name = "RenderTooLargeError";
  }
}

/**
 * Turns a photo reference into something the SVG can embed.
 *
 * The editor holds photos as data URLs, and the upload endpoint hands out
 * storage keys; both arrive here, and both end up as a data URI because an SVG
 * rendered outside a browser cannot fetch anything.
 */
export function createPhotoResolver(): PhotoResolver {
  const cache = new Map<string, string | null>();

  return async (src: string) => {
    if (cache.has(src)) return cache.get(src) ?? null;

    let resolved: string | null = null;

    if (src.startsWith("data:image/")) {
      resolved = src;
    } else {
      // `/api/photos/<key>` or the bare key.
      const key = src.replace(/^\/api\/photos\//, "");
      if (isValidKey(key)) {
        const bytes = await getPhotoStorage().read(key);
        const info = bytes ? identifyImage(bytes) : null;
        if (bytes && info) {
          resolved = `data:${info.contentType};base64,${Buffer.from(bytes).toString("base64")}`;
        }
      }
    }

    cache.set(src, resolved);
    return resolved;
  };
}

export interface RenderedPage {
  /** PNG bytes at the requested scale. */
  data: Buffer;
  width: number;
  height: number;
}

export async function renderPage(
  page: CanvasPage,
  scale: number,
): Promise<RenderedPage> {
  const width = Math.round(page.width * scale);
  const height = Math.round(page.height * scale);

  if (width * height > MAX_OUTPUT_PIXELS) {
    throw new RenderTooLargeError(width * height);
  }

  const svg = await renderPageSvg(page, createPhotoResolver());

  const data = await sharp(Buffer.from(svg), {
    // libvips rasterises the SVG at this density; 72 is the SVG unit baseline,
    // so multiplying it is what makes the vector content render large rather
    // than be scaled up afterwards.
    density: Math.round(72 * scale),
    limitInputPixels: MAX_OUTPUT_PIXELS,
  })
    .resize(width, height, { fit: "fill" })
    .png({ compressionLevel: 9 })
    .toBuffer();

  return { data, width, height };
}

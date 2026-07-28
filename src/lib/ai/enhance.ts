import type { Raster } from "@/lib/ai/raster";

/**
 * Server-side stand-in for automatic face enhancement.
 *
 * The same three moves a photographer makes on a flat photobooth frame, in the
 * order they would make them: lift the shadows, add contrast, warm the colour
 * slightly. It does not find faces — but a booth frame is mostly face, so
 * treating the whole image is a fair approximation of the visible result, and
 * the contract (photo in, better photo out, strength 0–1) is what a real model
 * would replace.
 *
 * Mirrors `lib/editor/image-adjust.ts` so the preview a user saw in the browser
 * matches what the server produces.
 */

function clamp(value: number): number {
  return value < 0 ? 0 : value > 255 ? 255 : Math.round(value);
}

export interface EnhanceStats {
  /** Mean luma before and after, so callers can show that something happened. */
  before: number;
  after: number;
}

export function enhanceFace(raster: Raster, intensity: number): EnhanceStats {
  const strength = Math.max(0, Math.min(1, intensity));
  const { data } = raster;

  const gamma = 1 - 0.28 * strength;
  const contrast = 1 + 0.22 * strength;
  const saturation = 1 + 0.18 * strength;

  // Gamma is the expensive part, so precompute the 256-entry curve.
  const curve = new Uint8ClampedArray(256);
  for (let value = 0; value < 256; value += 1) {
    const lifted = 255 * Math.pow(value / 255, gamma);
    curve[value] = clamp((lifted - 128) * contrast + 128);
  }

  let before = 0;
  let after = 0;
  let counted = 0;

  for (let index = 0; index < data.length; index += 4) {
    // Alpha of 0 means a cut-out pixel; leaving it alone keeps edges clean.
    if (data[index + 3] === 0) continue;

    before +=
      0.299 * data[index] + 0.587 * data[index + 1] + 0.114 * data[index + 2];

    const r = curve[data[index]];
    const g = curve[data[index + 1]];
    const b = curve[data[index + 2]];

    // Rec. 601 luma, the usual weighting for perceived brightness.
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;

    data[index] = clamp(luma + (r - luma) * saturation);
    data[index + 1] = clamp(luma + (g - luma) * saturation);
    data[index + 2] = clamp(luma + (b - luma) * saturation);

    after +=
      0.299 * data[index] + 0.587 * data[index + 1] + 0.114 * data[index + 2];
    counted += 1;
  }

  return counted === 0
    ? { before: 0, after: 0 }
    : {
        before: Number((before / counted).toFixed(2)),
        after: Number((after / counted).toFixed(2)),
      };
}

/** Whether any pixel is transparent, so the result is saved in a format that keeps it. */
export function hasAlpha({ data }: Raster): boolean {
  for (let index = 3; index < data.length; index += 4) {
    if (data[index] < 255) return true;
  }
  return false;
}

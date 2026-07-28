import type { Raster } from "@/lib/ai/raster";

/**
 * Server-side stand-in for the AI background remover.
 *
 * Same approach as the browser version in `lib/editor/background-removal.ts`,
 * deliberately: it samples the four corners, assumes they are background, and
 * clears pixels close to that colour, feathering the edge so the cut is not
 * hard-aliased. It has no idea what a person is.
 *
 * It lives on the server anyway because the contract is what matters — a photo
 * key in, a transparent PNG out — and that contract does not change when a real
 * segmentation model replaces the body of this function. Everything built on
 * it (progress, revert, exporting with alpha) is exercised for real in the
 * meantime.
 */

export const DEFAULT_TOLERANCE = 48;
export const MIN_TOLERANCE = 4;
export const MAX_TOLERANCE = 160;

/** Feather width, in colour-distance units, over which alpha ramps back in. */
const FEATHER = 24;

/** Average of the four corner pixels, so one odd pixel cannot skew it. */
function sampleBackground({ data, width, height }: Raster): [number, number, number] {
  const corners = [
    0,
    (width - 1) * 4,
    (height - 1) * width * 4,
    ((height - 1) * width + (width - 1)) * 4,
  ];

  const reference: [number, number, number] = [0, 0, 0];
  for (const corner of corners) {
    reference[0] += data[corner] / corners.length;
    reference[1] += data[corner + 1] / corners.length;
    reference[2] += data[corner + 2] / corners.length;
  }

  return reference;
}

export interface CutoutStats {
  /** Share of pixels made fully transparent, 0–1. */
  cleared: number;
  /** The colour that was treated as background. */
  background: [number, number, number];
}

/** Clears the background in place and reports what it did. */
export function removeBackground(
  raster: Raster,
  tolerance: number = DEFAULT_TOLERANCE,
): CutoutStats {
  const { data } = raster;
  const reference = sampleBackground(raster);
  let cleared = 0;

  for (let index = 0; index < data.length; index += 4) {
    const dr = data[index] - reference[0];
    const dg = data[index + 1] - reference[1];
    const db = data[index + 2] - reference[2];
    const delta = Math.sqrt(dr * dr + dg * dg + db * db);

    if (delta <= tolerance) {
      data[index + 3] = 0;
      cleared += 1;
    } else if (delta <= tolerance + FEATHER) {
      data[index + 3] = Math.round(
        data[index + 3] * ((delta - tolerance) / FEATHER),
      );
    }
  }

  return {
    cleared: cleared / (data.length / 4),
    background: [
      Math.round(reference[0]),
      Math.round(reference[1]),
      Math.round(reference[2]),
    ],
  };
}

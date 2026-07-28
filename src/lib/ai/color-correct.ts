import type { Raster } from "@/lib/ai/raster";

/**
 * Server-side stand-in for smart colour correction: per-channel auto levels.
 *
 * Each channel's histogram is stretched between its low and high percentiles,
 * which fixes a colour cast and flat contrast in one pass — the same trick as
 * "auto levels" in a photo editor. Clipping a small share at each end stops a
 * few stray pixels from deciding the whole mapping.
 *
 * A real model would judge white balance from what it recognises in the frame;
 * this judges it from the histogram. The contract either way is a photo in and
 * a corrected photo out, plus the per-channel range it decided on — which is
 * also the honest way to show the user what was done.
 */

/** Share of pixels ignored at each end of each channel's histogram. */
const CLIP_SHARE = 0.005;

function clamp(value: number): number {
  return value < 0 ? 0 : value > 255 ? 255 : Math.round(value);
}

export interface ChannelRange {
  low: number;
  high: number;
}

export interface CorrectionStats {
  /** The input range mapped onto 0–255, per channel. */
  ranges: [ChannelRange, ChannelRange, ChannelRange];
  /** Opaque pixels the histograms were built from. */
  sampled: number;
}

export function autoColorCorrect(raster: Raster): CorrectionStats | null {
  const { data } = raster;

  // Histograms are built from opaque pixels only, so a cut-out photo is levelled
  // on its subject rather than on the transparent surround.
  const histograms = [
    new Uint32Array(256),
    new Uint32Array(256),
    new Uint32Array(256),
  ];
  let counted = 0;

  for (let index = 0; index < data.length; index += 4) {
    if (data[index + 3] === 0) continue;
    histograms[0][data[index]] += 1;
    histograms[1][data[index + 1]] += 1;
    histograms[2][data[index + 2]] += 1;
    counted += 1;
  }

  // Nothing opaque to measure — a fully transparent image is not wrong, it just
  // has no colours to correct.
  if (counted === 0) return null;

  const clip = Math.max(1, Math.floor(counted * CLIP_SHARE));
  const ranges: ChannelRange[] = [];

  const tables = histograms.map((histogram) => {
    let low = 0;
    let high = 255;

    for (let running = 0, value = 0; value < 256; value += 1) {
      running += histogram[value];
      if (running > clip) {
        low = value;
        break;
      }
    }
    for (let running = 0, value = 255; value >= 0; value -= 1) {
      running += histogram[value];
      if (running > clip) {
        high = value;
        break;
      }
    }

    ranges.push({ low, high });

    const table = new Uint8ClampedArray(256);
    // A flat channel would divide by zero; leave it untouched instead.
    const span = high - low;
    for (let value = 0; value < 256; value += 1) {
      table[value] = span <= 0 ? value : clamp(((value - low) / span) * 255);
    }
    return table;
  });

  for (let index = 0; index < data.length; index += 4) {
    if (data[index + 3] === 0) continue;
    data[index] = tables[0][data[index]];
    data[index + 1] = tables[1][data[index + 1]];
    data[index + 2] = tables[2][data[index + 2]];
  }

  return {
    ranges: ranges as [ChannelRange, ChannelRange, ChannelRange],
    sampled: counted,
  };
}

/**
 * Local stand-in for the AI face enhancer.
 *
 * A real model would find the face and work only on it. This lifts shadows,
 * adds a little contrast and warms the skin tones across the whole frame —
 * which is most of what "the face came out dark and flat" actually needs, and
 * it gives the intensity slider something honest to control until the provider
 * call exists.
 */

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Gambar tidak bisa dimuat."));
    image.src = src;
  });
}

function clamp(value: number): number {
  return value < 0 ? 0 : value > 255 ? 255 : value;
}

/**
 * @param intensity 0–1. 0 returns the image unchanged.
 */
export async function enhanceFaceApprox(
  src: string,
  intensity: number,
): Promise<string> {
  const strength = Math.max(0, Math.min(1, intensity));
  if (strength === 0) return src;

  const image = await loadImage(src);
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  if (!width || !height) throw new Error("Ukuran gambar tidak terbaca.");

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Kanvas tidak tersedia.");

  context.drawImage(image, 0, 0);
  const frame = context.getImageData(0, 0, width, height);
  const { data } = frame;

  // Shadow lift, then contrast, then a touch of saturation — the same order a
  // photo editor would apply them.
  const gamma = 1 - 0.28 * strength;
  const contrast = 1 + 0.22 * strength;
  const saturation = 1 + 0.18 * strength;

  // Gamma is the expensive part, so precompute the 256-entry curve.
  const curve = new Uint8ClampedArray(256);
  for (let value = 0; value < 256; value += 1) {
    const lifted = 255 * Math.pow(value / 255, gamma);
    curve[value] = clamp((lifted - 128) * contrast + 128);
  }

  for (let index = 0; index < data.length; index += 4) {
    // Alpha of 0 means a cut-out pixel; leaving it alone keeps edges clean.
    if (data[index + 3] === 0) continue;

    const r = curve[data[index]];
    const g = curve[data[index + 1]];
    const b = curve[data[index + 2]];

    // Rec. 601 luma, the usual weighting for perceived brightness.
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;

    data[index] = clamp(luma + (r - luma) * saturation);
    data[index + 1] = clamp(luma + (g - luma) * saturation);
    data[index + 2] = clamp(luma + (b - luma) * saturation);
  }

  context.putImageData(frame, 0, 0);
  // PNG so a cut-out photo does not lose its alpha when enhanced afterwards.
  return canvas.toDataURL("image/png");
}

/**
 * Local stand-in for smart colour correction: per-channel auto levels.
 *
 * Each channel's histogram is stretched between its low and high percentiles,
 * which fixes a colour cast and flat contrast in one pass — the same trick as
 * "auto levels" in a photo editor. Clipping a small share at each end stops a
 * few stray pixels from deciding the whole mapping.
 */
const CLIP_SHARE = 0.005;

export async function autoColorCorrectApprox(src: string): Promise<string> {
  const image = await loadImage(src);
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  if (!width || !height) throw new Error("Ukuran gambar tidak terbaca.");

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Kanvas tidak tersedia.");

  context.drawImage(image, 0, 0);
  const frame = context.getImageData(0, 0, width, height);
  const { data } = frame;

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

  if (counted === 0) return src;

  const clip = Math.max(1, Math.floor(counted * CLIP_SHARE));

  /** Lookup table mapping [low..high] onto the full 0–255 range. */
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

  context.putImageData(frame, 0, 0);
  return canvas.toDataURL("image/png");
}

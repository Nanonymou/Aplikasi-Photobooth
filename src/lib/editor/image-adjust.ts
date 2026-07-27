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
